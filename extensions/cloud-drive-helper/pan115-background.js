import { RateLimiter } from './guangya-api.js'
import { getDirectoryUrl, validateClient, createQrToken, readQrImage, readQrStatus, exchangeQrToken, read115Folders } from './pan115-api.js'

const SESSIONS_KEY = 'pan115Sessions'
const TARGETS_KEY = 'pan115Targets'
const PENDING_KEY = 'pan115Pending'
const RULE_ID = 115

// 只对本扩展发出的目录请求附加扫码会话，不写入浏览器 Cookie，不影响官网登录。
export function buildSessionRule(extensionId, cookie, app = 'web', useAlternate = false) {
  return {
    id: RULE_ID, priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [{ header: 'cookie', operation: 'set', value: cookie }],
      responseHeaders: [{ header: 'set-cookie', operation: 'remove' }],
    },
    condition: {
      urlFilter: `|${getDirectoryUrl(app, useAlternate)}?`,
      initiatorDomains: [extensionId], resourceTypes: ['xmlhttprequest'],
    },
  }
}

export function create115Handler(chromeApi, limiter = new RateLimiter(chromeApi.storage.session, 'pan115LastRequestAt')) {
  const local = chromeApi.storage.local
  const temporary = chromeApi.storage.session

  async function setCookieRule(session, useAlternate = false) {
    await chromeApi.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [RULE_ID],
      addRules: session ? [buildSessionRule(chromeApi.runtime.id, session.cookie, session.app, useAlternate)] : [],
    })
  }

  async function requestFolders(session, parentId, page, useAlternate = false) {
    // 临时规则仅覆盖本次串行目录请求；请求结束即移除，凭证不留在规则中。
    await setCookieRule(session, useAlternate)
    try { return await limiter.run(() => read115Folders(parentId, page, session.app, useAlternate)) }
    finally { await setCookieRule(null) }
  }

  async function readFolders(session, parentId, page) {
    try { return await requestFolders(session, parentId, page) }
    catch (error) {
      if (error.code !== 230012) throw error
      // 网页列表拒绝时，沿用相同会话读取对应客户端的普通目录接口，仅尝试一次。
      return requestFolders(session, parentId, page, true)
    }
  }

  async function saveSession(session) {
    const state = await local.get([SESSIONS_KEY, TARGETS_KEY])
    const saved = state[TARGETS_KEY]?.[session.app]
    const target = saved?.accountId === session.accountId ? saved.target : null
    await local.set({
      [SESSIONS_KEY]: { ...state[SESSIONS_KEY], [session.app]: session },
      [TARGETS_KEY]: { ...state[TARGETS_KEY], [session.app]: { accountId: session.accountId, target } },
    })
    return target
  }

  async function getSession(app, connectionId) {
    const state = await local.get(SESSIONS_KEY)
    const session = state[SESSIONS_KEY]?.[app]
    if (!session) throw new Error('请先使用手机扫码连接 115')
    if (session.connectionId !== connectionId) throw new Error('115 连接已变化，请重新选择客户端并加载目录')
    return session
  }

  return async message => {
    let app = message.app
    if (message.type === 'get-state') {
      const state = await local.get([SESSIONS_KEY, TARGETS_KEY, 'pan115SelectedApp'])
      app ||= state.pan115SelectedApp || ''
      if (!app) return { connected: false, target: null, app: '' }
      validateClient(app)
      const session = state[SESSIONS_KEY]?.[app]
      const saved = state[TARGETS_KEY]?.[app]
      return {
        app, connected: Boolean(session), connectionId: session?.connectionId,
        target: session && saved?.accountId === session.accountId ? saved.target : null,
      }
    }
    validateClient(app)
    if (message.type === 'select-client') {
      await local.set({ pan115SelectedApp: app })
      return null
    }
    if (message.type === 'start-qr') {
      await temporary.remove(PENDING_KEY)
      const token = await limiter.run(() => createQrToken(app))
      const expiresAt = Date.now() + 120000
      const image = await limiter.run(() => readQrImage(token.uid))
      const attemptId = crypto.randomUUID()
      await temporary.set({ [PENDING_KEY]: { app, token, attemptId, expiresAt } })
      await local.set({ pan115SelectedApp: app })
      return { image, attemptId, expiresAt }
    }
    if (message.type === 'cancel-qr') {
      const pending = (await temporary.get(PENDING_KEY))[PENDING_KEY]
      if (pending?.attemptId === message.attemptId && pending.app === app) await temporary.remove(PENDING_KEY)
      return null
    }
    if (message.type === 'poll-qr') {
      const pending = (await temporary.get(PENDING_KEY))[PENDING_KEY]
      if (!pending || pending.attemptId !== message.attemptId || pending.app !== app) throw new Error('二维码已更换，请重新获取')
      if (pending.expiresAt <= Date.now()) {
        await temporary.remove(PENDING_KEY)
        return { status: 'expired' }
      }
      const status = await limiter.run(() => readQrStatus(pending.token))
      if (pending.expiresAt <= Date.now() || status === -1 || status === -2) {
        await temporary.remove(PENDING_KEY)
        return { status: status === -2 ? 'cancelled' : 'expired' }
      }
      if (status !== 2) return { status: status === 1 ? 'scanned' : 'waiting' }
      // 一次扫码只交换一次，后续目录重试复用已交换的会话。
      await temporary.remove(PENDING_KEY)
      const session = await limiter.run(() => exchangeQrToken(pending.token, app))
      session.connectionId = crypto.randomUUID()
      const previous = (await local.get(SESSIONS_KEY))[SESSIONS_KEY]?.[app]
      // 首次或同账号登录立即保留有效会话，目录失败可以重试；换账号仍等目录成功才替换旧连接。
      const keepSession = !previous || previous.accountId === session.accountId
      let target = keepSession ? await saveSession(session) : null
      let root
      try { root = await readFolders(session, '', 0) }
      catch (error) {
        if (!keepSession) throw error
        return { status: 'connected', root: null, directoryError: error.message, target, connectionId: session.connectionId }
      }
      if (!keepSession) target = await saveSession(session)
      return { status: 'connected', root, target, connectionId: session.connectionId }
    }
    if (message.type === 'disconnect') {
      await getSession(app, message.connectionId)
      const state = await local.get([SESSIONS_KEY, TARGETS_KEY])
      const sessions = { ...state[SESSIONS_KEY] }
      const targets = { ...state[TARGETS_KEY] }
      delete sessions[app]
      delete targets[app]
      await local.set({ [SESSIONS_KEY]: sessions, [TARGETS_KEY]: targets })
      await setCookieRule(null)
      return null
    }
    const session = await getSession(app, message.connectionId)
    if (message.type === 'list-folders') {
      if (message.parentId !== '') throw new Error('115 当前仅列出根目录第一层文件夹')
      return readFolders(session, '', message.page)
    }
    if (message.type === 'save-target') {
      const path = message.path
      if (!Array.isArray(path) || path.length !== 2 || path[0]?.id !== ''
        || path.some((item, index) => !item || typeof item.id !== 'string' || (index && !/^\d+$/.test(item.id))
          || typeof item.name !== 'string' || !item.name)) throw new Error('115 目标文件夹无效，请重新选择')
      const target = { id: path.at(-1).id, path: path.map(({ id, name }) => ({ id, name })) }
      const state = await local.get(TARGETS_KEY)
      await local.set({ [TARGETS_KEY]: { ...state[TARGETS_KEY], [app]: { accountId: session.accountId, target } } })
      return target
    }
    throw new Error('未知的 115 操作')
  }
}
