const API_URL = 'https://dapi.guangyapan.com/userres/v1/file/get_file_list'
const PAGE_SIZE = 50
const ROTATIONS = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
const MD5_CONSTANTS = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0)

// Web Crypto 不提供 MD5；协议要求使用 MD5 的原始 16 字节结果。
export function md5Bytes(text) {
  const bytes = new TextEncoder().encode(text)
  const buffer = new ArrayBuffer(Math.ceil((bytes.length + 9) / 64) * 64)
  const padded = new Uint8Array(buffer)
  const view = new DataView(buffer)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  view.setUint32(buffer.byteLength - 8, (bytes.length * 8) >>> 0, true)
  view.setUint32(buffer.byteLength - 4, Math.floor(bytes.length / 2 ** 29), true)
  const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]

  for (let offset = 0; offset < buffer.byteLength; offset += 64) {
    let [a, b, c, d] = state
    for (let index = 0; index < 64; index++) {
      const round = Math.floor(index / 16)
      const mixed = round === 0 ? (b & c) | (~b & d)
        : round === 1 ? (d & b) | (~d & c)
          : round === 2 ? b ^ c ^ d : c ^ (b | ~d)
      const wordIndex = round === 0 ? index : round === 1 ? (5 * index + 1) % 16
        : round === 2 ? (3 * index + 5) % 16 : (7 * index) % 16
      const sum = (a + mixed + MD5_CONSTANTS[index] + view.getUint32(offset + wordIndex * 4, true)) >>> 0
      const rotation = ROTATIONS[round * 4 + index % 4]
      const next = (b + ((sum << rotation) | (sum >>> (32 - rotation)))) >>> 0
      a = d
      d = c
      c = b
      b = next
    }
    for (const [index, value] of [a, b, c, d].entries()) state[index] = (state[index] + value) >>> 0
  }

  const digest = new DataView(new ArrayBuffer(16))
  state.forEach((value, index) => digest.setUint32(index * 4, value, true))
  return new Uint8Array(digest.buffer)
}

function toHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function createSignature({ clientId, clientSecret }, nonce, timestamp) {
  const source = `client_id=${clientId}&client_secret=${clientSecret}&nonce=${nonce}&timestamp=${timestamp}`
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-512', md5Bytes(source))))
}

export function validateCredentials(value) {
  const clientId = typeof value?.clientId === 'string' ? value.clientId.trim() : ''
  const clientSecret = typeof value?.clientSecret === 'string' ? value.clientSecret.trim() : ''
  if (!clientId || !clientSecret || /\s/.test(clientId + clientSecret) || clientId.length > 256 || clientSecret.length > 512) {
    throw new Error('请完整填写光鸭开发者 client_id 和 client_secret')
  }
  return { clientId, clientSecret }
}

export class RateLimiter {
  constructor(storage) {
    this.storage = storage
    this.queue = Promise.resolve()
  }

  run(request) {
    const pending = this.queue.then(async () => {
      const { guangyaLastRequestAt = 0 } = await this.storage.get('guangyaLastRequestAt')
      const delay = Math.max(0, 2000 - (Date.now() - guangyaLastRequestAt))
      if (delay) await new Promise(resolve => setTimeout(resolve, delay))
      // 存在 session 中，后台休眠后重新启动仍遵守请求间隔。
      await this.storage.set({ guangyaLastRequestAt: Date.now() })
      try {
        return await request()
      } finally {
        await this.storage.set({ guangyaLastRequestAt: Date.now() })
      }
    })
    this.queue = pending.catch(() => {})
    return pending
  }
}

export async function readFolderPage(credentials, parentId = '', page = 0) {
  if (typeof parentId !== 'string' || !Number.isSafeInteger(page) || page < 0) {
    throw new Error('目录或分页参数无效')
  }
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)))
  const timestamp = String(Math.floor(Date.now() / 1000))
  const sign = await createSignature(credentials, nonce, timestamp)
  let response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', client_id: credentials.clientId, nonce, timestamp, sign },
      body: JSON.stringify({ parentId, page, pageSize: PAGE_SIZE, dirType: 1, orderBy: 0, sortType: 0, resType: 2 }),
      signal: AbortSignal.timeout(15000),
    })
  } catch (error) {
    throw new Error(error.name === 'TimeoutError' || error.name === 'AbortError'
      ? '光鸭请求超时，请稍后重试' : '无法连接光鸭，请检查网络后重试')
  }
  if (!response.ok) throw new Error(`光鸭请求失败（HTTP ${response.status}）`)

  let body
  try {
    body = await response.json()
  } catch {
    throw new Error('光鸭返回的响应不是有效 JSON')
  }
  // 实测成功响应可能省略 code；必须同时核对成功文案和目录数据结构。
  if (!body || (body.code === undefined ? body.msg !== 'success' : body.code !== 0)) {
    throw new Error(`光鸭拒绝了请求${Number.isSafeInteger(body?.code) ? `（错误码 ${body.code}）` : ''}，请检查凭证及会员状态`)
  }
  const data = body.data
  const total = data?.total ?? 0
  const list = data?.list ?? (total === 0 ? [] : null)
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Number.isSafeInteger(total) || total < 0 || !Array.isArray(list)
    || total < list.length || list.some(item => !item || item.resType !== 2
      || typeof item.fileId !== 'string' || !item.fileId || typeof item.fileName !== 'string')) {
    throw new Error('光鸭返回的文件夹数据格式异常')
  }
  return {
    folders: list.map(item => ({ id: item.fileId, name: item.fileName })),
    total,
    page,
    pageSize: PAGE_SIZE,
  }
}
