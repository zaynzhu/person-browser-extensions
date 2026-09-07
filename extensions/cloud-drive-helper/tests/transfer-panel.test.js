import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

function storage(values = {}) {
  return { values, async get(keys) { return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, structuredClone(values[key])])) }, async set(data) { Object.assign(values, structuredClone(data)) }, async remove(key) { delete values[key] }, async setAccessLevel() {} }
}

test('右键提交不创建标签，普通网页及错误令牌无法读取任务，授权框和独立配置页可读取', async t => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)))
  assert.equal(manifest.action.default_popup, undefined)
  let listener, click, openConfig
  let configOpened = false
  let injected
  const temporary = storage()
  globalThis.chrome = {
    runtime: { id: 'synthetic', getURL: path => `chrome-extension://synthetic/${path}`, openOptionsPage: async () => { configOpened = true }, onMessage: { addListener: value => { listener = value } } },
    action: { setBadgeText: async () => {}, onClicked: { addListener: value => { openConfig = value } } }, storage: { local: storage(), session: temporary },
    contextMenus: { onClicked: { addListener: value => { click = value } } },
    scripting: { executeScript: async options => { injected = options } },
    tabs: { create: async () => { throw new Error('不得打开新标签') } },
  }
  t.after(() => { delete globalThis.chrome })
  t.mock.method(globalThis, 'fetch', () => { throw new Error('无效链接不应请求云盘') })
  await import('../background.js')
  await openConfig()
  assert.equal(configOpened, true)
  click({ menuItemId: 'save-share', selectionText: '合成无效链接' }, { id: 7 })
  for (let count = 0; count < 30 && !injected; count++) await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(injected.target.tabId, 7)
  const panelUrl = injected.args[0]
  const send = sender => new Promise(resolve => listener({ type: 'list-transfers' }, sender, resolve))
  assert.equal((await send({ id: 'synthetic', tab: { id: 7 }, url: 'https://synthetic.example/' })).ok, false)
  assert.equal((await send({ id: 'synthetic', tab: { id: 8 }, url: panelUrl })).ok, false)
  assert.equal((await send({ id: 'synthetic', tab: { id: 7 }, url: 'chrome-extension://synthetic/transfer-panel.html?token=wrong' })).ok, false)
  const allowed = await send({ id: 'synthetic', tab: { id: 7 }, url: panelUrl })
  assert.equal(allowed.ok, true)
  assert.equal(allowed.data[0].status, 'failed')
  assert.equal((await send({ id: 'synthetic', tab: { id: 9, url: 'chrome-extension://synthetic/popup.html' }, url: 'chrome-extension://synthetic/transfer-panel.html?token=config' })).ok, true)
  assert.equal((await send({ id: 'synthetic', tab: { id: 9, url: 'https://synthetic.example/' }, url: 'chrome-extension://synthetic/transfer-panel.html?token=config' })).ok, false)
})
