export const CLIENT_TYPES = {
  android: '115生活 · 安卓 App',
  '115android': '115 · 安卓 App',
  ios: '115生活 · iOS App',
  '115ios': '115 · iOS App',
  ipad: '115生活 · iPad',
  '115ipad': '115 · iPad',
  os_linux: 'Linux',
  os_mac: 'macOS',
  tv: '115网盘 · 安卓电视',
  apple_tv: '115网盘 · Apple TV',
  qandroid: '115管理 · 安卓 App',
  qios: '115管理 · iOS App',
  qipad: '115管理 · iPad',
  alipaymini: '115生活 · 支付宝小程序',
  wechatmini: '115生活 · 微信小程序',
  harmony: '115 · 鸿蒙',
  web: '网页端',
}

const QR_ORIGIN = 'https://qrcodeapi.115.com'
const PAGE_SIZE = 50

export function validateClient(app) {
  if (!Object.hasOwn(CLIENT_TYPES, app)) throw new Error('请选择 115 扫码客户端类型')
  return app
}

async function request(url, options = {}) {
  const { timeoutMs = 15000, ...fetchOptions } = options
  let response
  try {
    response = await fetch(url, {
      ...fetchOptions, credentials: 'omit', redirect: 'error', cache: 'no-store',
      referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (cause) {
    const error = new Error('115 网络请求失败或超时，请稍后重试')
    error.isTimeout = cause.name === 'TimeoutError' || cause.name === 'AbortError'
    throw error
  }
  if (!response.ok) throw new Error(`115 请求失败（HTTP ${response.status}）`)
  return response
}

async function requestJson(url, options = {}) {
  const { stage, ...fetchOptions } = options
  try {
    const response = await request(url, fetchOptions)
    let body
    try { body = await response.json() } catch { throw new Error('115 响应格式异常') }
    if (!body || ![true, 1].includes(body.state)) {
      const code = [body?.code, body?.errno, body?.errcode].find(value =>
        Number.isSafeInteger(value) || (typeof value === 'string' && /^-?\d{1,16}$/.test(value)))
      throw new Error(`115 拒绝了请求${code !== undefined ? `（${code}）` : ''}`)
    }
    return body
  } catch (error) {
    error.message = `${stage}：${error.message}`
    throw error
  }
}

export async function createQrToken(app) {
  validateClient(app)
  const body = await requestJson(`${QR_ORIGIN}/api/1.0/${app}/1.0/token/`, { stage: `${CLIENT_TYPES[app]} 二维码生成` })
  const data = body.data
  if (!data || typeof data.uid !== 'string' || !data.uid || typeof data.sign !== 'string' || !data.sign
    || !Number.isSafeInteger(data.time)) throw new Error('115 二维码响应格式异常')
  return { uid: data.uid, sign: data.sign, time: data.time }
}

export async function readQrImage(uid) {
  const response = await request(`${QR_ORIGIN}/api/1.0/web/1.0/qrcode?${new URLSearchParams({ uid })}`)
  const mime = response.headers.get('content-type')?.split(';')[0]
  if (!['image/png', 'image/jpeg'].includes(mime)) throw new Error('115 未返回有效二维码图片')
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (!bytes.length || bytes.length > 1024 * 1024) throw new Error('115 二维码图片大小异常')
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:${mime};base64,${btoa(binary)}`
}

export async function readQrStatus(token) {
  const query = new URLSearchParams({ uid: token.uid, time: String(token.time), sign: token.sign })
  let body
  try { body = await requestJson(`${QR_ORIGIN}/get/status/?${query}`, { timeoutMs: 20000, stage: '扫码状态查询' }) }
  catch (error) {
    // 状态接口会长轮询；无状态变化导致的超时继续等待，由后台的两分钟期限统一结束。
    if (error.isTimeout) return 0
    throw error
  }
  if (![0, 1, 2, -1, -2].includes(body.data?.status)) throw new Error('115 扫码状态异常，请重新获取二维码')
  return body.data.status
}

export function normalizeSession(data, app) {
  validateClient(app)
  const cookies = data?.cookie
  if (!cookies || ['UID', 'CID', 'SEID'].some(key => typeof cookies[key] !== 'string' || !cookies[key])) {
    throw new Error('115 未返回完整登录会话，请重新扫码')
  }
  const names = ['UID', 'CID', 'SEID', ...(cookies.KID ? ['KID'] : [])]
  if (names.some(key => typeof cookies[key] !== 'string' || !/^[\x21-\x7e]+$/.test(cookies[key])
    || /[;,]/.test(cookies[key]) || cookies[key].length > 8192)) throw new Error('115 登录会话格式异常')
  const accountId = cookies.UID.split('_')[0]
  if (!/^\d+$/.test(accountId)) throw new Error('115 账号标识无效')
  return { app, accountId, cookie: names.map(key => `${key}=${cookies[key]}`).join('; ') }
}

export async function exchangeQrToken(token, app) {
  validateClient(app)
  const body = await requestJson(`https://passportapi.115.com/app/1.0/${app}/1.0/login/qrcode/`, {
    method: 'POST', body: new URLSearchParams({ app, account: token.uid }),
    stage: `${CLIENT_TYPES[app]} 登录凭证交换`,
  })
  return normalizeSession(body.data, app)
}

export async function read115Folders(parentId = '', page = 0) {
  if (typeof parentId !== 'string' || (parentId && !/^\d+$/.test(parentId))
    || !Number.isSafeInteger(page) || page < 0 || !Number.isSafeInteger(page * PAGE_SIZE)) {
    throw new Error('115 目录或分页参数无效')
  }
  const query = new URLSearchParams({
    aid: '1', cid: parentId || '0', offset: String(page * PAGE_SIZE), limit: String(PAGE_SIZE),
    show_dir: '1', nf: '1', count_folders: '1', o: 'file_name', asc: '1', custom_order: '1',
    record_open_time: '0', format: 'json',
  })
  const body = await requestJson(`https://webapi.115.com/files?${query}`, { stage: '目录读取' })
  const total = typeof body.count === 'string' && /^\d+$/.test(body.count) ? Number(body.count) : body.count
  if (!Array.isArray(body.data) || !Number.isSafeInteger(total) || total < body.data.length
    || body.data.some(item => !item || item.fid !== undefined || typeof item.cid !== 'string'
      || !/^\d+$/.test(item.cid) || typeof item.n !== 'string' || !item.n)) {
    throw new Error('115 文件夹响应格式异常，未保存目录选择')
  }
  return { folders: body.data.map(item => ({ id: item.cid, name: item.n })), total, page, pageSize: PAGE_SIZE }
}
