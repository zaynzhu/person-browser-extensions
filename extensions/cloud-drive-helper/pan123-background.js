import { RateLimiter } from './guangya-api.js'
import { login123, read123Folders } from './pan123-api.js'

const SESSION_KEY = 'pan123Session'
const TARGET_KEY = 'pan123Target'

export function create123Handler(chromeApi, limiter = new RateLimiter(chromeApi.storage.session, 'pan123LastRequestAt')) {
  const local = chromeApi.storage.local

  async function saveSession(session) {
    const saved = (await local.get(TARGET_KEY))[TARGET_KEY]
    const target = saved?.accountId === session.accountId ? saved.target : null
    await local.set({ [SESSION_KEY]: session, [TARGET_KEY]: { accountId: session.accountId, target } })
    return target
  }

  return async message => {
    const state = await local.get([SESSION_KEY, TARGET_KEY])
    const session = state[SESSION_KEY]
    const connected = Boolean(session && session.expiresAt > Date.now())
    if (message.type === 'get-state') return {
      connected, connectionId: connected ? session.connectionId : null,
      target: connected && state[TARGET_KEY]?.accountId === session.accountId ? state[TARGET_KEY].target : null,
    }
    if (message.type === 'connect') {
      const next = await limiter.run(() => login123(message.credentials))
      next.connectionId = crypto.randomUUID()
      const keepSession = !session || session.accountId === next.accountId
      let target = keepSession ? await saveSession(next) : null
      let root
      try { root = await limiter.run(() => read123Folders(next)) }
      catch (error) {
        if (!keepSession) throw error
        return { root: null, directoryError: error.message, target, connectionId: next.connectionId }
      }
      if (!keepSession) target = await saveSession(next)
      return { root, target, connectionId: next.connectionId }
    }
    if (!session || session.connectionId !== message.connectionId) throw new Error('123 连接已变化，请重新选择云盘并加载目录')
    if (message.type === 'disconnect') {
      await local.remove([SESSION_KEY, TARGET_KEY])
      return null
    }
    if (!connected) throw new Error('123 登录已过期，请重新登录')
    if (message.type === 'list-folders') {
      if (message.parentId !== '') throw new Error('123 当前仅列出根目录第一层文件夹')
      return limiter.run(() => read123Folders(session, message.page))
    }
    if (message.type === 'save-target') {
      const path = message.path
      if (!Array.isArray(path) || path.length !== 2 || path[0]?.id !== ''
        || path.some((entry, index) => !entry || typeof entry.id !== 'string' || (index && !/^\d+$/.test(entry.id))
          || typeof entry.name !== 'string' || !entry.name)) throw new Error('123 目标文件夹无效，请重新选择')
      const target = { id: path[1].id, path: path.map(({ id, name }) => ({ id, name })) }
      await local.set({ [TARGET_KEY]: { accountId: session.accountId, target } })
      return target
    }
    throw new Error('未知的 123 操作')
  }
}
