import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { createSignature, md5Bytes, readFolderPage, validateCredentials } from '../guangya-api.js'

const CREDENTIALS = { clientId: 'dvlp_test_only', clientSecret: 'synthetic-secret-not-a-real-credential' }
const FOLDER = { fileId: '9007199254740993123', fileName: '合成目录 <示例>', resType: 2 }

test('MD5 与独立实现核对空串、填充边界、多块数据及中文', () => {
  for (const text of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'a'.repeat(127), '中文目录📂'.repeat(20)]) {
    assert.equal(Buffer.from(md5Bytes(text)).toString('hex'), createHash('md5').update(text).digest('hex'))
  }
})

test('签名使用 MD5 原始字节再做 SHA512，不对 MD5 文本摘要二次哈希', async () => {
  const nonce = '0123456789abcdef0123456789abcdef'
  const timestamp = '1700000000'
  const source = `client_id=${CREDENTIALS.clientId}&client_secret=${CREDENTIALS.clientSecret}&nonce=${nonce}&timestamp=${timestamp}`
  const expected = createHash('sha512').update(createHash('md5').update(source).digest()).digest('hex')
  const wrong = createHash('sha512').update(createHash('md5').update(source).digest('hex')).digest('hex')
  const actual = await createSignature(CREDENTIALS, nonce, timestamp)
  assert.equal(actual, expected)
  assert.notEqual(actual, wrong)
})

test('凭证去除首尾空格，拒绝缺失和换行内容', () => {
  assert.deepEqual(validateCredentials({ clientId: ' test-id ', clientSecret: ' test-secret ' }), { clientId: 'test-id', clientSecret: 'test-secret' })
  for (const value of [null, {}, { clientId: 'test-id', clientSecret: '' }, { clientId: 'test\nid', clientSecret: 'test' }]) {
    assert.throws(() => validateCredentials(value), /完整填写/)
  }
})

test('读取目录请求包含正确签名、目录过滤和分页，不发送密钥或 Cookie', async t => {
  let captured
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    captured = { url, options }
    return Response.json({ code: 0, data: { total: 101, list: [FOLDER] } })
  })
  const result = await readFolderPage(CREDENTIALS, 'parent-id', 1)
  assert.deepEqual(result, { folders: [{ id: FOLDER.fileId, name: FOLDER.fileName }], total: 101, page: 1, pageSize: 50 })
  assert.equal(captured.url, 'https://dapi.guangyapan.com/userres/v1/file/get_file_list')
  assert.equal(captured.options.method, 'POST')
  assert.equal(captured.options.credentials, 'omit')
  assert.equal(captured.options.redirect, 'error')
  assert.deepEqual(JSON.parse(captured.options.body), { parentId: 'parent-id', page: 1, pageSize: 50, dirType: 1, orderBy: 0, sortType: 0, resType: 2 })
  const headers = captured.options.headers
  assert.match(headers.nonce, /^[a-f0-9]{32}$/)
  assert.equal(headers.sign, await createSignature(CREDENTIALS, headers.nonce, headers.timestamp))
  assert.ok(!JSON.stringify(captured).includes(CREDENTIALS.clientSecret))
})

test('兼容实测的成功响应省略 code，并支持空目录省略零值字段', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ msg: 'success', data: { total: 1, list: [FOLDER] } }))
  assert.equal((await readFolderPage(CREDENTIALS)).folders[0].id, FOLDER.fileId)
  globalThis.fetch = async () => Response.json({ msg: 'success', data: {} })
  assert.equal((await readFolderPage(CREDENTIALS)).total, 0)
})

test('拒绝业务错误、异常数据、失真的目录 ID 及伪成功响应', async t => {
  const invalid = [
    { code: 117, msg: CREDENTIALS.clientSecret, data: {} },
    { msg: 'denied', data: {} },
    { msg: 'success' },
    { code: 0, data: 'bad' },
    { code: 0, data: { total: -1, list: [] } },
    { code: 0, data: { total: 2, list: null } },
    { code: 0, data: { total: 1, list: [{ ...FOLDER, fileId: 123 }] } },
    { code: 0, data: { total: 1, list: [{ ...FOLDER, resType: 1 }] } },
  ]
  t.mock.method(globalThis, 'fetch', async () => Response.json(invalid.shift()))
  while (invalid.length) {
    await assert.rejects(readFolderPage(CREDENTIALS), error => {
      assert.ok(!error.message.includes(CREDENTIALS.clientSecret))
      return true
    })
  }
})

test('HTTP、非 JSON、网络超时和非法页码均给出明确失败', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 403 }))
  await assert.rejects(readFolderPage(CREDENTIALS), /HTTP 403/)
  globalThis.fetch = async () => new Response('<html>错误页</html>')
  await assert.rejects(readFolderPage(CREDENTIALS), /JSON/)
  globalThis.fetch = async () => { throw new DOMException('timeout', 'TimeoutError') }
  await assert.rejects(readFolderPage(CREDENTIALS), /超时/)
  await assert.rejects(readFolderPage(CREDENTIALS, '', -1), /参数无效/)
})
