import { RateLimiter, readFolderPage, validateCredentials } from './guangya-api.js'

const CREDENTIALS_KEY = 'guangyaCredentials'
const TARGET_KEY = 'guangyaTarget'
const limiter = new RateLimiter(chrome.storage.session)
const ready = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
let commands = Promise.resolve()

async function getCredentials() {
  const state = await chrome.storage.local.get(CREDENTIALS_KEY)
  if (!state[CREDENTIALS_KEY]) throw new Error('请先连接光鸭账号')
  return state[CREDENTIALS_KEY]
}

async function handleMessage(message) {
  await ready
  if (message.type === 'get-state') {
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
    await chrome.storage.local.remove([CREDENTIALS_KEY, TARGET_KEY])
    return null
  }
  if (message.type === 'list-folders') {
    const credentials = await getCredentials()
    return limiter.run(() => readFolderPage(credentials, message.parentId, message.page))
  }
  if (message.type === 'save-target') {
    await getCredentials()
    const path = message.path
    if (!Array.isArray(path) || !path.length || path.length > 100 || path[0]?.id !== ''
      || path.some((entry, index) => !entry || typeof entry.id !== 'string' || (index > 0 && !entry.id)
        || typeof entry.name !== 'string' || !entry.name)) {
      throw new Error('目标文件夹无效，请重新选择')
    }
    const target = { id: path.at(-1).id, path: path.map(({ id, name }) => ({ id, name })) }
    await chrome.storage.local.set({ [TARGET_KEY]: target })
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
