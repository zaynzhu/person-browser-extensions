import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCachedHandler } from '../directory-cache.js'

function fixture() {
  const values = {}
  const local = { async get(key) { return { [key]: structuredClone(values[key]) } }, async set(data) { Object.assign(values, structuredClone(data)) }, async remove(key) { delete values[key] } }
  let state = { connected: true, connectionId: 'synthetic-connection', app: 'web' }
  let failure = null
  let reads = 0
  const root = { folders: [{ id: '1', name: '合成目录' }], total: 1, page: 0, pageSize: 50 }
  const handler = async message => {
    if (message.type === 'get-state') return state
    if (message.type === 'connect') { state = { ...state, connectionId: 'synthetic-new' }; return { root, connectionId: state.connectionId } }
    if (message.connectionId !== state.connectionId) throw new Error('旧连接')
    if (message.type === 'disconnect') { state = { ...state, connected: false }; return null }
    reads++
    if (failure) throw failure
    return root
  }
  return { local, handler, root, get reads() { return reads }, fail(error) { failure = error } }
}

for (const provider of ['115', 'guangya', '123']) test(`${provider} 缓存跨后台重启恢复，读取状态零网络，刷新和测试主动请求，退出清除`, async () => {
  const f = fixture()
  let handle = createCachedHandler(f.local, f.handler)
  const base = { provider, mode: 'developer', app: 'web', connectionId: 'synthetic-connection' }
  const list = { ...base, type: 'list-folders', parentId: '', page: 0 }
  await handle(list)
  handle = createCachedHandler(f.local, f.handler)
  assert.deepEqual((await handle({ ...base, type: 'get-state' })).root, f.root)
  await handle(list)
  assert.equal(f.reads, 1)
  await handle({ ...list, force: true })
  await handle({ ...base, type: 'test-connection' })
  assert.equal(f.reads, 3)
  await assert.rejects(handle({ ...list, connectionId: 'stale' }), /旧连接/)
  await handle({ ...base, type: 'disconnect' })
  assert.equal((await handle({ ...base, type: 'get-state' })).root, null)
})

test('测试网络失败保留连接与缓存，认证失效显示未连接，重新登录恢复', async () => {
  const f = fixture()
  const handle = createCachedHandler(f.local, f.handler)
  const base = { provider: '123', connectionId: 'synthetic-connection' }
  await handle({ ...base, type: 'list-folders', parentId: '', page: 0 })
  f.fail(new Error('网络超时'))
  await assert.rejects(handle({ ...base, type: 'test-connection' }), /网络超时/)
  assert.equal((await handle({ ...base, type: 'get-state' })).connected, true)
  f.fail(Object.assign(new Error('登录失效'), { authExpired: true }))
  await assert.rejects(handle({ ...base, type: 'test-connection' }), /登录失效/)
  assert.equal((await handle({ ...base, type: 'get-state' })).connected, false)
  assert.equal((await handle({ ...base, type: 'get-state' })).root, null)
  f.fail(null)
  await handle({ ...base, type: 'connect' })
  assert.equal((await handle({ ...base, type: 'get-state' })).connected, true)
})

test('115 类型和光鸭授权方式的缓存隔离', async () => {
  const f = fixture()
  const handle = createCachedHandler(f.local, f.handler)
  const base = { provider: 'guangya', connectionId: 'synthetic-connection' }
  await handle({ ...base, mode: 'developer', type: 'list-folders', parentId: '', page: 0 })
  assert.equal((await handle({ ...base, mode: 'web', type: 'get-state' })).root, null)
  assert.equal((await handle({ ...base, provider: '115', type: 'get-state' })).root, null)
})
