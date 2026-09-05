import { RateLimiter, readFolderPage, validateCredentials } from './guangya-api.js'
import { readGuangyaWebSession } from './web-session.js'
import { create115Handler } from './pan115-background.js'

const CREDENTIALS_KEY = 'guangyaCredentials'
const TARGET_KEY = 'guangyaTarget'
const WEB_KEY = 'guangyaWebSession'
const WEB_TARGET_KEY = 'guangyaWebTarget'
const limiter = new RateLimiter(chrome.storage.session)
const ready = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
let commands = Promise.resolve()
const handle115 = create115Handler(chrome)

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage())

async function getWebSession() {
  const state = await chrome.storage.session.get(WEB_KEY)
  const session = state[WEB_KEY]
  if (!session || session.expiresAt <= Date.now()) throw new Error('请先在光鸭官网登录，再连接网页登录账号')
  return session
}

async function getCredentials() {
  const state = await chrome.storage.local.get(CREDENTIALS_KEY)
  if (!state[CREDENTIALS_KEY]) throw new Error('请先连接光鸭账号')
  return state[CREDENTIALS_KEY]
}

async function handleMessage(message) {
  await ready
  if (message.provider === '115') return handle115(message)
  if (message.provider && message.provider !== 'guangya') throw new Error('此云盘尚未接入')
  const web = message.mode === 'web'
  const targetKey = web ? WEB_TARGET_KEY : TARGET_KEY
  if (message.type === 'open-web-login') {
    const tab = await chrome.tabs.create({ url: 'https://www.guangyapan.com/' })
    await chrome.storage.session.set({ guangyaLoginTabId: tab.id })
    return null
  }
  if (message.type === 'connect-web') {
    const { guangyaLoginTabId } = await chrome.storage.session.get('guangyaLoginTabId')
    if (!Number.isInteger(guangyaLoginTabId)) throw new Error('请先点击“打开光鸭官网登录”')
    let results
    try {
      const tab = await chrome.tabs.get(guangyaLoginTabId)
      if (new URL(tab.url).origin !== 'https://www.guangyapan.com') throw new Error()
      results = await chrome.scripting.executeScript({ target: { tabId: guangyaLoginTabId }, func: readGuangyaWebSession })
    } catch {
      throw new Error('登录标签页已关闭或地址已改变，请重新打开光鸭官网登录')
    }
    const session = results?.[0]?.result
    if (!session) throw new Error('尚未登录或登录已过期，请在刚打开的光鸭官网完成登录或刷新后重试')
    const root = await limiter.run(() => readFolderPage(session, '', 0, true))
    const state = await chrome.storage.local.get(WEB_TARGET_KEY)
    const saved = state[WEB_TARGET_KEY]
    const target = saved?.accountId === session.accountId ? saved.target : null
    await chrome.storage.session.set({ [WEB_KEY]: session })
    await chrome.storage.local.set({ [WEB_TARGET_KEY]: { accountId: session.accountId, target } })
    return { root, target }
  }
  if (message.type === 'get-state') {
    if (web) {
      const session = (await chrome.storage.session.get(WEB_KEY))[WEB_KEY]
      const saved = (await chrome.storage.local.get(WEB_TARGET_KEY))[WEB_TARGET_KEY]
      const connected = Boolean(session && session.expiresAt > Date.now())
      return { connected, target: connected && saved?.accountId === session.accountId ? saved.target : null }
    }
    const state = await chrome.storage.local.get([CREDENTIALS_KEY, TARGET_KEY])
    return { connected: Boolean(state[CREDENTIALS_KEY]), target: state[TARGET_KEY] || null }
  }
  if (message.type === 'connect') {
    const credentials = validateCredentials(message.credentials)
    const root = await limiter.run(() => readFolderPage(credentials))
    const state = await chrome.storage.local.get([CREDENTIALS_KEY, TARGET_KEY])
    const sameAccount = state[CREDENTIALS_KEY]?.clientId === credentials.clientId
    const target = sameAccount ? state[TARGET_KEY] || null : null
    // 只有根目录读取成功才替换连接；失败时保留原连接和目标。
    await chrome.storage.local.set({ [CREDENTIALS_KEY]: credentials, [TARGET_KEY]: target })
    return { root, target }
  }
  if (message.type === 'disconnect') {
    if (web) {
      await chrome.storage.session.remove([WEB_KEY, 'guangyaLoginTabId'])
      await chrome.storage.local.remove(WEB_TARGET_KEY)
      return null
    }
    await chrome.storage.local.remove([CREDENTIALS_KEY, TARGET_KEY])
    return null
  }
  if (message.type === 'list-folders') {
    const credentials = web ? await getWebSession() : await getCredentials()
    return limiter.run(() => readFolderPage(credentials, message.parentId, message.page, web))
  }
  if (message.type === 'save-target') {
    const session = web ? await getWebSession() : await getCredentials()
    const path = message.path
    if (!Array.isArray(path) || !path.length || path.length > 100 || path[0]?.id !== ''
      || path.some((entry, index) => !entry || typeof entry.id !== 'string' || (index > 0 && !entry.id)
        || typeof entry.name !== 'string' || !entry.name)) {
      throw new Error('目标文件夹无效，请重新选择')
    }
    const target = { id: path.at(-1).id, path: path.map(({ id, name }) => ({ id, name })) }
    await chrome.storage.local.set({ [targetKey]: web ? { accountId: session.accountId, target } : target })
    return target
  }
  throw new Error('未知操作')
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html')) return
  // 将连接、读目录和断开串行执行，避免切换账号时混入旧账号数据。
  const pending = commands.then(() => handleMessage(message))
  commands = pending.catch(() => {})
  pending.then(data => sendResponse({ ok: true, data }))
    .catch(error => sendResponse({ ok: false, error: error.message }))
  return true
})
