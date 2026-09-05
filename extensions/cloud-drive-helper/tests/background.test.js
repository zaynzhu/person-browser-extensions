import assert from 'node:assert/strict'
import { test } from 'node:test'

test('后台连接、目录选择与断开保持凭证边界和原子性', async t => {
  const state = {}
  let listener
  let accessLevel
  const local = {
    get: async () => structuredClone(state),
    set: async value => Object.assign(state, structuredClone(value)),
    remove: async keys => keys.forEach(key => delete state[key]),
    setAccessLevel: async value => { accessLevel = value.accessLevel },
  }
  const runtime = {
    id: 'synthetic-extension',
    getURL: path => `chrome-extension://synthetic-extension/${path}`,
    onMessage: { addListener: value => { listener = value } },
  }
  globalThis.chrome = { runtime, action: { onClicked: { addListener: () => {} } }, storage: { local, session: { get: async () => ({}), set: async () => {} } } }
  t.after(() => { delete globalThis.chrome })
  t.mock.method(globalThis, 'fetch', async () => Response.json({ msg: 'success', data: {} }))
  await import('../background.js')
  const sender = { id: runtime.id, url: runtime.getURL('popup.html') }
  const send = message => new Promise(resolve => listener(message, sender, resolve))
  assert.equal(listener({ type: 'get-state' }, { id: 'other', url: 'https://example.test' }, () => {}), undefined)
  const credentials = { clientId: 'synthetic-id', clientSecret: 'synthetic-secret' }
  assert.equal((await send({ type: 'connect', credentials })).ok, true)
  assert.equal(accessLevel, 'TRUSTED_CONTEXTS')
  assert.deepEqual(state.guangyaCredentials, credentials)
  const status = await send({ type: 'get-state' })
  assert.deepEqual(status.data, { connected: true, target: null })
  assert.ok(!JSON.stringify(status).includes(credentials.clientSecret))
  const path = [{ id: '', name: '根目录' }, { id: 'folder-test', name: '合成文件夹' }]
  assert.equal((await send({ type: 'save-target', path })).ok, true)
  assert.equal(state.guangyaTarget.id, 'folder-test')
  globalThis.fetch = async () => Response.json({ code: 401, msg: 'invalid' })
  assert.equal((await send({ type: 'connect', credentials: { clientId: 'another-test', clientSecret: 'invalid-test' } })).ok, false)
  assert.deepEqual(state.guangyaCredentials, credentials)
  assert.equal(state.guangyaTarget.id, 'folder-test')
  globalThis.fetch = async () => Response.json({ code: 0, data: {} })
  await send({ type: 'connect', credentials: { clientId: 'another-test', clientSecret: 'valid-test' } })
  assert.equal(state.guangyaTarget, null)
  await send({ type: 'disconnect' })
  assert.deepEqual(state, {})
  assert.equal((await send({ type: 'list-folders', parentId: '', page: 0 })).ok, false)
})
