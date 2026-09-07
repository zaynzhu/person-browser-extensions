import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

// 仅用于真实浏览器中的合成界面验收，不调用云盘接口，不加载真实凭证。
function installMockChrome() {
  const root = [
    { id: 'movie-demo', name: '合成电影' },
    { id: 'empty-demo', name: '空文件夹' },
    { id: 'error-demo', name: '读取失败示例' },
    { id: 'text-demo', name: '<img src=x onerror=alert(1)>' },
    ...Array.from({ length: 47 }, (_, index) => ({ id: `demo-${index}`, name: `分页示例 ${index + 1}` })),
  ]
  let pendingQr = null
  const states = { developer: { connected: false, target: null }, web: { connected: false, target: null } }
  function list(parentId = '', page = 0) {
    if (parentId === 'error-demo') throw new Error('合成目录读取失败，请重试')
    const folders = parentId === '' ? root : parentId === 'movie-demo' ? [{ id: 'child-demo', name: '合成待看' }] : []
    return { folders: folders.slice(page * 50, (page + 1) * 50), total: folders.length, page, pageSize: 50 }
  }
  globalThis.chrome = { runtime: { sendMessage: async message => {
    await new Promise(resolve => setTimeout(resolve, 120))
    try {
      let data
      const key = message.provider === '115' ? `115-${message.app || ''}` : message.provider === '123' ? '123' : message.mode || 'developer'
      const state = states[key] ||= { connected: false, target: null }
      if (message.type === 'start-qr') {
        if (!message.app) throw new Error('请选择 115 扫码客户端类型')
        pendingQr = { id: crypto.randomUUID(), polls: 0 }
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#eee"/><text x="120" y="120" text-anchor="middle" font-size="18">合成扫码预览</text></svg>'
        return { ok: true, data: { attemptId: pendingQr.id, expiresAt: Date.now() + 120000, image: `data:image/svg+xml,${encodeURIComponent(svg)}` } }
      }
      if (message.type === 'cancel-qr') { pendingQr = null; return { ok: true, data: null } }
      if (message.type === 'poll-qr') {
        if (!pendingQr || pendingQr.id !== message.attemptId) throw new Error('合成二维码已更换')
        if (++pendingQr.polls === 1) return { ok: true, data: { status: 'scanned' } }
        pendingQr = null
        state.connected = true
        state.connectionId = crypto.randomUUID()
        return { ok: true, data: { status: 'connected', root: list(), target: state.target, connectionId: state.connectionId } }
      }
      let { connected, target } = state
      if (message.type === 'get-state') data = { connected, target, app: message.app || '', connectionId: state.connectionId }
      else if (message.type === 'open-web-login') data = null
      else if (message.type === 'connect' || message.type === 'connect-web') {
        if (message.credentials?.clientSecret === 'invalid') throw new Error('合成凭证无效')
        connected = true
        state.connected = true
        state.connectionId = crypto.randomUUID()
        data = { root: list(), target, connectionId: state.connectionId }
      } else if (message.type === 'list-folders') data = list(message.parentId, message.page)
      else if (message.type === 'save-target') {
        target = { id: message.path.at(-1).id, path: message.path }
        state.target = target
        data = target
      } else if (message.type === 'disconnect') {
        connected = false
        target = null
        state.connected = false
        state.target = null
        data = null
      } else throw new Error('未知合成操作')
      return { ok: true, data }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  } } }
}

const allowed = new Map([['/popup.html', 'text/html'], ['/popup.js', 'text/javascript'], ['/popup.css', 'text/css'], ['/pan115-api.js', 'text/javascript'], ['/directory-cache.js', 'text/javascript'], ['/transfer-panel.html', 'text/html'], ['/transfer-panel.js', 'text/javascript'], ['/transfer-panel.css', 'text/css'], ['/transfer-overlay.js', 'text/javascript']])
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname
  response.setHeader('Cache-Control', 'no-store')
  if (path === '/queue-preview.html') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>合成转存队列验收</title>
      <body style="padding:32px;font-family:system-ui"><h1>合成队列验收</h1><p>此页不调用云盘接口，不包含真实账号或分享链接。</p>
      <button id="add">添加合成任务</button><button id="finish">完成当前任务</button><input id="unrelated" aria-label="继续操作网页" placeholder="任务期间仍可在这里输入">
      <script type="module">
      import { installTransferPanel } from './transfer-overlay.js'
      window.demoJobs = []
      document.querySelector('#add').onclick = () => {
        const index = window.demoJobs.length + 1
        window.demoJobs.unshift({ jobId: String(index), createdAt: Date.now(), provider: '123', sourceLabel: '合成分享-' + index, targetPath: '根目录 / 合成目录', status: window.demoJobs.some(job => job.status === 'preparing') ? 'queued' : 'preparing', message: '合成任务，仅供界面验收' })
        installTransferPanel(new URL('/transfer-panel.html?token=synthetic', location.href).href, 'synthetic')
      }
      document.querySelector('#finish').onclick = () => {
        const current = window.demoJobs.find(job => job.status === 'preparing')
        if (current) { current.status = 'success'; current.message = '合成结果已核实' }
        const next = window.demoJobs.toReversed().find(job => job.status === 'queued')
        if (next) next.status = 'preparing'
      }
      </script></body></html>`)
    return
  }
  if (path === '/queue-mock.js') {
    response.setHeader('Content-Type', 'text/javascript')
    response.end(`globalThis.chrome = { runtime: { sendMessage: async () => ({ ok: true, data: window.parent.demoJobs || [] }), openOptionsPage: async () => {} } }`)
    return
  }
  if (path === '/preview-mock.js') {
    response.setHeader('Content-Type', 'text/javascript')
    response.end(`import { createCachedHandler } from './directory-cache.js'
(${installMockChrome.toString()})()
const values = {}
const local = { async get(key) { return { [key]: values[key] } }, async set(data) { Object.assign(values, data) }, async remove(key) { delete values[key] } }
const original = chrome.runtime.sendMessage
const cached = createCachedHandler(local, async message => {
  const response = await original(message)
  if (!response.ok) throw new Error(response.error)
  return response.data
})
chrome.runtime.sendMessage = async message => {
  try { return { ok: true, data: await cached(message) } }
  catch (error) { return { ok: false, error: error.message, authExpired: error.authExpired } }
}`)
    return
  }
  if (!allowed.has(path)) {
    response.writeHead(404).end()
    return
  }
  try {
    let content = await readFile(new URL(`..${path}`, import.meta.url), 'utf8')
    if (path === '/transfer-panel.html') content = content.replace('<script type="module"', '<script src="queue-mock.js"></script><script type="module"')
    if (path === '/popup.html') {
      content = content.replace('<script type="module"', '<script type="module" src="preview-mock.js"></script><script type="module"')
      content = content.replace('<title>', '<title>合成验收 · ')
    }
    response.setHeader('Content-Type', allowed.get(path))
    response.end(content)
  } catch {
    response.writeHead(500).end('预览文件读取失败')
  }
})
server.listen(0, '127.0.0.1', () => console.log(`合成预览：http://127.0.0.1:${server.address().port}/popup.html`))
