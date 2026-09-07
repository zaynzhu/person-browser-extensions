const API_ORIGIN = 'https://api.123278.com'
const PAGE_SIZE = 100

function crc32(text) {
  let value = 0xffffffff
  for (const byte of new TextEncoder().encode(text)) {
    value ^= byte
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
  }
  return (value ^ 0xffffffff) >>> 0
}

export function create123Signature(path, now, nonce) {
  const date = new Date(now + 8 * 3600000).toISOString().slice(0, 16).replace(/\D/g, '')
  const alphabet = 'adefghlmyi'
  const key = String(crc32([...date].map(digit => alphabet[Number(digit)]).join('')))
  const timestamp = Math.floor(now / 1000)
  const checksum = crc32([timestamp, nonce, path, 'web', '3', key].join('|'))
  return [key, `${timestamp}-${nonce}-${checksum}`]
}

function safeId(value) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('123 标识格式异常')
  if (!/^\d+$/.test(String(value))) throw new Error('123 标识格式异常')
  return String(value)
}

export function normalize123Session(token) {
  try {
    if (typeof token !== 'string' || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) throw new Error()
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')))
    const accountId = safeId(payload.id)
    const expiresAt = payload.exp * 1000
    if (!Number.isSafeInteger(payload.exp) || expiresAt <= Date.now()) throw new Error()
    return { token, accountId, expiresAt }
  } catch { throw new Error('123 登录令牌无效或已过期，请重新登录') }
}

export async function request123(path, { params = {}, body, token } = {}) {
  const url = new URL(`/b/api/${path}`, API_ORIGIN)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
  const nonce = crypto.getRandomValues(new Uint32Array(1))[0] % 10000001
  const [key, value] = create123Signature(url.pathname, Date.now(), nonce)
  url.searchParams.set(key, value)
  let response
  try {
    response = await fetch(url.href, {
      method: body ? 'POST' : 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', platform: 'web', 'App-Version': '3', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
    })
  } catch { throw new Error('123 请求失败或超时，请稍后重试') }
  if (response.status === 401) throw Object.assign(new Error('123 登录已失效，请重新登录'), { authExpired: true })
  if (!response.ok) throw new Error(`123 服务请求失败（HTTP ${response.status}）`)
  let result
  try { result = await response.json() } catch { throw new Error('123 返回的数据格式异常') }
  if (![0, 200].includes(result?.code)) {
    if (result?.code === 401) throw Object.assign(new Error('123 登录已失效，请重新登录'), { authExpired: true })
    if (/验证码|验证|captcha|verify/i.test(String(result?.message || result?.msg || ''))) throw new Error('123 要求人机验证，请先在官网完成验证后重试；本版暂不支持验证码登录')
    throw Object.assign(new Error('123 拒绝请求，请检查账号、分享权限或稍后重试'), { definitive: true })
  }
  return result.data
}

export async function login123(credentials) {
  const username = typeof credentials?.username === 'string' ? credentials.username.trim() : ''
  const password = credentials?.password
  if (!username || username.length > 256 || typeof password !== 'string' || !password || password.length > 512) throw new Error('请输入有效的 123 账号和密码')
  const body = username.includes('@') ? { mail: username, password, type: 2 } : { passport: username, password, remember: true }
  const data = await request123('user/sign_in', { body })
  return normalize123Session(data?.token)
}

export async function read123Folders(session, page = 0) {
  if (!Number.isSafeInteger(page) || page < 0) throw new Error('123 分页参数无效')
  normalize123Session(session?.token)
  const data = await request123('file/list/new', {
    token: session.token,
    params: { driveId: 0, limit: PAGE_SIZE, next: 0, orderBy: 'file_id', orderDirection: 'desc', parentFileId: 0, trashed: false, SearchData: '', Page: page + 1, OnlyLookAbnormalFile: 0, event: 'homeListFile', operateType: 4, inDirectSpace: false },
  })
  if (!Array.isArray(data?.InfoList) || !Number.isSafeInteger(data.Total) || data.Total < 0) throw new Error('123 目录格式异常')
  const folders = []
  for (const entry of data.InfoList) {
    if (entry?.Type === 0) continue
    if (entry?.Type !== 1 || safeId(entry.ParentFileId) !== '0' || typeof entry.FileName !== 'string' || !entry.FileName) throw new Error('123 目录格式异常')
    folders.push({ id: safeId(entry.FileId), name: entry.FileName })
  }
  return { folders, total: data.Total, page, pageSize: PAGE_SIZE }
}
