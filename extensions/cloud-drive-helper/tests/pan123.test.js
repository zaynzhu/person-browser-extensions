import assert from 'node:assert/strict'
import { test } from 'node:test'
import { create123Signature, login123, read123Folders, normalize123Session } from '../pan123-api.js'
import { create123Handler } from '../pan123-background.js'

const token = (id = '123', exp = Math.floor(Date.now() / 1000) + 3600) => `e30.${Buffer.from(JSON.stringify({ id, exp })).toString('base64url')}.synthetic`
const directory = { code: 0, data: { InfoList: [{ Type: 1, FileId: '3500603448510908007', ParentFileId: 0, FileName: '合成目录' }, { Type: 0, FileId: 2, FileName: '合成文件' }], Total: 101 } }
function storage(initial = {}) {
  const values = structuredClone(initial)
  return { values, async get(keys) { return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, structuredClone(values[key])])) }, async set(data) { Object.assign(values, structuredClone(data)) }, async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete values[key] } }
}

test('123 签名与独立 CRC32 样例一致', () => {
  assert.deepEqual(create123Signature('/b/api/file/list/new', 1788710400000, 12345), ['4217296194', '1788710400-12345-2867287563'])
})

test('123 登录保留密码空格、仅向固定服务发送，邮箱使用独立字段', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url: new URL(url), options }); return Response.json({ code: 200, data: { token: token() } }) })
  assert.equal((await login123({ username: ' 123 ', password: ' synthetic ' })).accountId, '123')
  await login123({ username: 'synthetic@example.com', password: 'synthetic' })
  assert.deepEqual(JSON.parse(calls[0].options.body), { passport: '123', password: ' synthetic ', remember: true })
  assert.deepEqual(JSON.parse(calls[1].options.body), { mail: 'synthetic@example.com', password: 'synthetic', type: 2 })
  for (const { url, options } of calls) {
    assert.equal(url.origin, 'https://api.123278.com')
    assert.equal(url.pathname, '/b/api/user/sign_in')
    assert.equal(options.credentials, 'omit')
    assert.equal(options.redirect, 'error')
    assert.equal(options.headers.Authorization, undefined)
  }
  assert.throws(() => normalize123Session(token('123', 1)), /过期/)
  assert.throws(() => normalize123Session(token(3500603448510908007)), /无效/)
})

test('123 根目录分页过滤普通文件，保留大 ID，拒绝损坏结构和过期登录', async t => {
  let body = directory
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++
    const params = new URL(url).searchParams
    assert.equal(params.get('parentFileId'), '0')
    assert.equal(params.get('Page'), '2')
    assert.equal(params.get('limit'), '100')
    assert.match(options.headers.Authorization, /^Bearer /)
    return Response.json(body)
  })
  const read = () => read123Folders(normalize123Session(token()), 1)
  const result = await read()
  assert.equal(result.total, 101)
  assert.deepEqual(result.folders, [{ id: '3500603448510908007', name: '合成目录' }])
  body = { code: 0, data: { ...directory.data, InfoList: [{ ...directory.data.InfoList[0], ParentFileId: 2 }] } }
  await assert.rejects(read(), /目录格式异常/)
  body = { code: 401 }
  await assert.rejects(read(), /失效/)
  assert.equal(calls, 3)
  await assert.rejects(read123Folders({ token: token('123', 1) }, 1), /过期/)
  assert.equal(calls, 3)
})

test('123 人机验证只提示，不重试，不泄露服务返回内容', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ code: 999, message: '验证码 synthetic-secret' }) })
  await assert.rejects(login123({ username: '123', password: 'synthetic' }), error => /人机验证/.test(error.message) && !error.message.includes('synthetic-secret'))
  assert.equal(calls, 1)
})

test('123 首次目录失败保留令牌供刷新，换账号失败保留旧连接，目标和断开隔离', async t => {
  const local = storage({ guangyaCredentials: { synthetic: true }, pan115Sessions: { web: { synthetic: true } } })
  const chromeApi = { storage: { local, session: storage() } }
  const handle = create123Handler(chromeApi, { run: action => action() })
  let account = '123'
  let failDirectory = true
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.includes('sign_in')) return Response.json({ code: 200, data: { token: token(account) } })
    return Response.json(failDirectory ? { code: 999 } : directory)
  })
  const connect = () => handle({ type: 'connect', credentials: { username: 'synthetic', password: 'secret-not-saved' } })
  const first = await connect()
  assert.equal(first.root, null)
  assert.ok(first.directoryError)
  assert.equal(JSON.stringify(local.values).includes('secret-not-saved'), false)
  assert.equal((await handle({ type: 'get-state' })).connected, true)
  const connectionId = first.connectionId
  failDirectory = false
  assert.equal((await handle({ type: 'list-folders', parentId: '', page: 0, connectionId })).folders.length, 1)
  await handle({ type: 'save-target', connectionId, path: [{ id: '', name: '根目录' }, { id: '42', name: '合成目标' }] })
  account = '456'
  failDirectory = true
  await assert.rejects(connect())
  assert.equal(local.values.pan123Session.accountId, '123')
  assert.equal((await handle({ type: 'get-state' })).target.id, '42')
  await assert.rejects(handle({ type: 'list-folders', connectionId, parentId: '42', page: 0 }), /第一层/)
  failDirectory = false
  const second = await connect()
  assert.equal(second.target, null)
  await assert.rejects(handle({ type: 'disconnect', connectionId }), /连接已变化/)
  await handle({ type: 'disconnect', connectionId: second.connectionId })
  assert.equal(local.values.pan123Session, undefined)
  assert.deepEqual(local.values.guangyaCredentials, { synthetic: true })
  assert.deepEqual(local.values.pan115Sessions, { web: { synthetic: true } })
})
