import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createQrToken, readQrStatus, exchangeQrToken, normalizeSession, read115Folders } from '../pan115-api.js'
import { create115Handler, buildSessionRule } from '../pan115-background.js'

const cookies = id => ({ UID: `${id}_A1_synthetic`, CID: 'synthetic-cid', SEID: 'synthetic-seid', KID: 'synthetic-kid' })
const folderBody = { state: true, count: 1, data: [{ cid: '3500603448510908007', n: '合成目录' }] }

test('115 扫码接口绑定所选客户端，使用隔离请求并检查状态和完整会话', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    if (url.includes('/token/')) return Response.json({ state: true, data: { uid: 'synthetic-qr', time: 123, sign: 'synthetic-sign' } })
    if (url.includes('/get/status/')) return Response.json({ state: true, data: { status: 2 } })
    return Response.json({ state: true, data: { cookie: cookies('12345') } })
  })
  const token = await createQrToken('android')
  assert.equal(await readQrStatus(token), 2)
  const session = await exchangeQrToken(token, 'android')
  assert.equal(session.accountId, '12345')
  assert.equal(session.app, 'android')
  assert.match(calls[0].url, /\/android\/1\.0\/token\/$/)
  assert.match(calls[2].url, /\/android\/1\.0\/login\/qrcode\/$/)
  assert.equal(calls[2].options.body.get('app'), 'android')
  assert.equal(calls[2].options.body.get('account'), token.uid)
  assert.ok(calls.every(({ options }) => options.credentials === 'omit' && options.redirect === 'error'))
  await assert.rejects(createQrToken('../unknown'), /请选择/)
  assert.throws(() => normalizeSession({ cookie: { UID: '1' } }, 'web'), /完整登录会话/)
  assert.throws(() => normalizeSession({ cookie: { ...cookies('1'), SEID: 'a\r\nCookie:evil' } }, 'web'), /格式异常/)
})

test('115 目录保留大整数 ID，分页只请求文件夹，拒绝混入文件和伪成功', async t => {
  let body = folderBody
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const parsed = new URL(url)
    assert.equal(parsed.hostname, 'webapi.115.com')
    assert.equal(parsed.searchParams.get('nf'), '1')
    assert.equal(parsed.searchParams.get('offset'), '100')
    assert.equal(parsed.searchParams.get('cid'), '3500603448510908007')
    assert.equal(parsed.searchParams.get('record_open_time'), '0')
    assert.equal(options.credentials, 'omit')
    return Response.json(body)
  })
  const read = () => read115Folders('3500603448510908007', 2)
  assert.equal((await read()).folders[0].id, '3500603448510908007')
  body = { ...folderBody, data: [{ cid: 3500603448510908007, n: '精度丢失' }] }
  await assert.rejects(read(), /格式异常/)
  body = { ...folderBody, data: [{ fid: '2', cid: '1', n: '文件' }] }
  await assert.rejects(read(), /格式异常/)
  body = { state: false, data: [], count: 0 }
  await assert.rejects(read(), /目录读取：115 拒绝/)
  await assert.rejects(read115Folders('', -1), /分页/)
})

test('115 会话规则仅作用于本扩展目录请求，不修改网页 Cookie', () => {
  const rule = buildSessionRule('synthetic-extension', 'UID=synthetic')
  assert.deepEqual(rule.condition.initiatorDomains, ['synthetic-extension'])
  assert.equal(rule.condition.urlFilter, '|https://webapi.115.com/files?')
  assert.deepEqual(rule.action.responseHeaders, [{ header: 'set-cookie', operation: 'remove' }])
})

test('115 状态长轮询超时继续等待，普通网络错误停止，不吞掉异常', async t => {
  const token = { uid: 'synthetic', time: 123, sign: 'synthetic' }
  t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('合成超时', 'TimeoutError') })
  assert.equal(await readQrStatus(token), 0)
  globalThis.fetch = async () => { throw new TypeError('合成断网') }
  await assert.rejects(readQrStatus(token), /网络请求失败/)
})

test('115 全流程：等待、取消、持久恢复、多客户端隔离、换账号、失败回滚与旧页面保护', async t => {
  const state = { guangyaCredentials: { clientId: 'keep-guangya' } }
  const temporary = {}
  const store = data => ({
    get: async () => structuredClone(data),
    set: async value => Object.assign(data, structuredClone(value)),
    remove: async keys => (Array.isArray(keys) ? keys : [keys]).forEach(key => delete data[key]),
  })
  let rules = []
  let status = 0
  let account = '12345'
  let failDirectory = false
  let qrRequests = 0
  const chromeApi = {
    runtime: { id: 'synthetic-extension' },
    storage: { local: store(state), session: store(temporary) },
    declarativeNetRequest: { updateSessionRules: async value => { rules = value.addRules } },
  }
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.includes('/token/')) {
      qrRequests++
      return Response.json({ state: 1, data: { uid: `synthetic-${qrRequests}`, sign: 'synthetic-sign', time: 123 } })
    }
    if (url.includes('/qrcode?')) return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } })
    if (url.includes('/get/status/')) return Response.json({ state: 1, data: { status } })
    if (url.includes('/login/qrcode/')) return Response.json({ state: true, data: { cookie: cookies(account) } })
    assert.equal(rules.length, 1)
    assert.match(rules[0].action.requestHeaders[0].value, new RegExp(`UID=${account}_`))
    return Response.json(failDirectory ? { state: false, code: 99 } : folderBody)
  })
  const limiter = { run: action => action() }
  let handler = create115Handler(chromeApi, limiter)
  const send = (type, extra = {}) => handler({ type, app: 'android', ...extra })
  let attempt = await send('start-qr')
  assert.equal((await send('poll-qr', { attemptId: attempt.attemptId })).status, 'waiting')
  const replacement = await send('start-qr')
  await send('cancel-qr', { attemptId: attempt.attemptId })
  assert.equal(temporary.pan115Pending.attemptId, replacement.attemptId)
  await assert.rejects(send('poll-qr', { attemptId: attempt.attemptId }), /更换/)
  status = 2
  let result = await send('poll-qr', { attemptId: replacement.attemptId })
  assert.equal(result.status, 'connected')
  assert.deepEqual(rules, [])
  assert.equal(temporary.pan115Pending, undefined)
  assert.ok(!JSON.stringify(result).includes('synthetic-seid'))
  const path = [{ id: '', name: '根目录' }, { id: '23', name: '合成目标' }]
  await send('save-target', { path, connectionId: result.connectionId })
  const originalConnection = result.connectionId
  handler = create115Handler(chromeApi, limiter)
  assert.equal((await send('get-state')).target.id, '23')
  assert.equal((await send('get-state')).connected, true)
  assert.ok(!JSON.stringify(await send('get-state')).includes('synthetic-seid'))
  attempt = await send('start-qr', { app: 'web' })
  const web = await send('poll-qr', { app: 'web', attemptId: attempt.attemptId })
  assert.ok(state.pan115Sessions.android && state.pan115Sessions.web)
  assert.equal(state.pan115Targets.android.target.id, '23')
  account = '67890'
  attempt = await send('start-qr')
  failDirectory = true
  await assert.rejects(send('poll-qr', { attemptId: attempt.attemptId }), /拒绝/)
  assert.equal(state.pan115Sessions.android.accountId, '12345')
  assert.equal(state.pan115Targets.android.target.id, '23')
  assert.deepEqual(rules, [])
  failDirectory = false
  attempt = await send('start-qr')
  result = await send('poll-qr', { attemptId: attempt.attemptId })
  assert.equal(result.target, null)
  await assert.rejects(send('save-target', { path, connectionId: originalConnection }), /连接已变化/)
  await send('disconnect', { connectionId: result.connectionId })
  assert.equal(state.pan115Sessions.android, undefined)
  assert.equal(state.pan115Sessions.web.connectionId, web.connectionId)
  assert.equal(state.guangyaCredentials.clientId, 'keep-guangya')
  attempt = await send('start-qr')
  temporary.pan115Pending.expiresAt = 0
  assert.equal((await send('poll-qr', { attemptId: attempt.attemptId })).status, 'expired')
  assert.equal(temporary.pan115Pending, undefined)
  attempt = await send('start-qr')
  status = -2
  assert.equal((await send('poll-qr', { attemptId: attempt.attemptId })).status, 'cancelled')
  assert.equal(temporary.pan115Pending, undefined)
})


test('115 拒绝响应标明失败阶段，保留字符串错误码且不泄露响应内容', async t => {
  let body = { state: false, errno: '990001', error: 'synthetic-secret' }
  t.mock.method(globalThis, 'fetch', async () => Response.json(body))
  await assert.rejects(readQrStatus({ uid: 'synthetic', time: 123, sign: 'synthetic' }), /扫码状态查询：115 拒绝了请求（990001）/)
  await assert.rejects(exchangeQrToken({ uid: 'synthetic' }, 'harmony'), /鸿蒙.*登录凭证交换：115 拒绝了请求（990001）/)
  await assert.rejects(read115Folders('', 0), /目录读取：115 拒绝了请求（990001）/)
  body = { state: false, code: 'synthetic-secret', message: 'synthetic-secret' }
  await assert.rejects(read115Folders('', 0), error => {
    assert.match(error.message, /目录读取/)
    assert.ok(!error.message.includes('synthetic-secret'))
    assert.ok(!error.message.includes('重新扫码'))
    return true
  })
})
