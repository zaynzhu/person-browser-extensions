import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readGuangyaWebSession } from '../web-session.js'
import { readFolderPage } from '../guangya-api.js'

test('网页登录只读取指定凭证，拒绝错误来源、过期及损坏数据，不导出刷新令牌', t => {
  let value = { access_token: 'synthetic-token', refresh_token: 'never-export', sub: 'user-a', expires_at: new Date(Date.now() + 60000).toISOString() }
  globalThis.location = { origin: 'https://www.guangyapan.com' }
  globalThis.localStorage = { getItem: key => {
    assert.equal(key, 'credentials_aMe-8VSlkrbQXpUR')
    return JSON.stringify(value)
  } }
  t.after(() => { delete globalThis.location; delete globalThis.localStorage })
  assert.deepEqual(Object.keys(readGuangyaWebSession()).sort(), ['accessToken', 'accountId', 'expiresAt'])
  globalThis.location.origin = 'https://other.test'
  assert.equal(readGuangyaWebSession(), null)
  globalThis.location.origin = 'https://www.guangyapan.com'
  value.expires_at = '2000-01-01'
  assert.equal(readGuangyaWebSession(), null)
  value = null
  assert.equal(readGuangyaWebSession(), null)
})

test('网页登录目录请求使用独立主机与 Bearer，过期时不请求网络', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++
    assert.equal(url, 'https://api.guangyapan.com/userres/v1/file/get_file_list')
    assert.deepEqual(options.headers, { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-token' })
    assert.equal(options.credentials, 'omit')
    assert.equal(options.redirect, 'error')
    return Response.json({ msg: 'success', data: { total: 0 } })
  })
  const session = { accessToken: 'synthetic-token', expiresAt: Date.now() + 60000 }
  assert.equal((await readFolderPage(session, '', 0, true)).total, 0)
  await assert.rejects(readFolderPage({ ...session, expiresAt: 0 }, '', 0, true), /过期/)
  assert.equal(calls, 1)
})

test('双连接隔离，网页登录失败保留旧连接，切换账号清除旧目标，拒绝网页消息', async t => {
  const state = { guangyaCredentials: { clientId: 'developer', clientSecret: 'synthetic-secret' }, guangyaTarget: { id: 'developer-folder' } }
  const sessionState = {}
  const storage = data => ({
    get: async () => structuredClone(data),
    set: async value => Object.assign(data, structuredClone(value)),
    remove: async keys => (Array.isArray(keys) ? keys : [keys]).forEach(key => delete data[key]),
    setAccessLevel: async () => {},
  })
  let listener
  let click
  let opened = false
  let tabUrl = 'https://www.guangyapan.com/'
  let candidate = { accessToken: 'synthetic-token', accountId: 'user-a', expiresAt: Date.now() + 60000 }
  const runtime = {
    id: 'synthetic-extension',
    getURL: path => `chrome-extension://synthetic-extension/${path}`,
    openOptionsPage: async () => { opened = true },
    onMessage: { addListener: value => { listener = value } },
  }
  globalThis.chrome = {
    runtime, action: { onClicked: { addListener: value => { click = value } } },
    storage: { local: storage(state), session: storage(sessionState) },
    tabs: { create: async () => ({ id: 7 }), get: async id => { assert.equal(id, 7); return { url: tabUrl } } },
    scripting: { executeScript: async options => {
      assert.equal(options.target.tabId, 7)
      assert.equal(options.func, readGuangyaWebSession)
      return [{ result: candidate }]
    } },
  }
  t.after(() => { delete globalThis.chrome })
  t.mock.method(globalThis, 'fetch', async () => Response.json({ msg: 'success', data: {} }))
  await import('../background.js')
  await click()
  assert.equal(opened, true)
  const sender = { id: runtime.id, url: runtime.getURL('popup.html') }
  const send = message => new Promise(resolve => listener({ mode: 'web', ...message }, sender, resolve))
  assert.equal(listener({}, { id: runtime.id, url: 'https://www.guangyapan.com/' }, () => {}), undefined)
  assert.equal((await send({ type: 'connect-web' })).ok, false)
  await send({ type: 'open-web-login' })
  assert.equal((await send({ type: 'connect-web' })).ok, true)
  assert.ok(!JSON.stringify(state).includes('synthetic-token'))
  assert.ok(!JSON.stringify(await send({ type: 'get-state' })).includes('synthetic-token'))
  const path = [{ id: '', name: '根目录' }, { id: 'web-folder', name: '合成目录' }]
  await send({ type: 'save-target', path })
  candidate = null
  assert.equal((await send({ type: 'connect-web' })).ok, false)
  assert.equal(sessionState.guangyaWebSession.accountId, 'user-a')
  assert.equal(state.guangyaWebTarget.target.id, 'web-folder')
  candidate = { accessToken: 'synthetic-other', accountId: 'user-b', expiresAt: Date.now() + 60000 }
  tabUrl = 'https://other.test/'
  assert.equal((await send({ type: 'connect-web' })).ok, false)
  tabUrl = 'https://www.guangyapan.com/'
  assert.equal((await send({ type: 'connect-web' })).ok, true)
  assert.equal(state.guangyaWebTarget.target, null)
  await send({ type: 'disconnect' })
  assert.equal(sessionState.guangyaWebSession, undefined)
  assert.equal(state.guangyaCredentials.clientId, 'developer')
  assert.equal(state.guangyaTarget.id, 'developer-folder')
  assert.equal((await send({ type: 'get-state' })).data.connected, false)
})
