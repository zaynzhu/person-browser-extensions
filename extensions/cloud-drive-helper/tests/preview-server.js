import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

// 仅用于真实浏览器中的合成界面验收，不调用光鸭，不加载真实凭证。
function installMockChrome() {
  const root = [
    { id: 'movie-demo', name: '合成电影' },
    { id: 'empty-demo', name: '空文件夹' },
    { id: 'error-demo', name: '读取失败示例' },
    { id: 'text-demo', name: '<img src=x onerror=alert(1)>' },
    ...Array.from({ length: 47 }, (_, index) => ({ id: `demo-${index}`, name: `分页示例 ${index + 1}` })),
  ]
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
      const state = states[message.mode || 'developer']
      let { connected, target } = state
      if (message.type === 'get-state') data = { connected, target }
      else if (message.type === 'open-web-login') data = null
      else if (message.type === 'connect' || message.type === 'connect-web') {
        if (message.credentials?.clientSecret === 'invalid') throw new Error('合成凭证无效')
        connected = true
        state.connected = true
        data = { root: list(), target }
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

const allowed = new Map([['/popup.html', 'text/html'], ['/popup.js', 'text/javascript'], ['/popup.css', 'text/css']])
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname
  response.setHeader('Cache-Control', 'no-store')
  if (path === '/preview-mock.js') {
    response.setHeader('Content-Type', 'text/javascript')
    response.end(`(${installMockChrome.toString()})()`)
    return
  }
  if (!allowed.has(path)) {
    response.writeHead(404).end()
    return
  }
  try {
    let content = await readFile(new URL(`..${path}`, import.meta.url), 'utf8')
    if (path === '/popup.html') {
      content = content.replace('<script type="module"', '<script src="preview-mock.js"></script><script type="module"')
      content = content.replace('<title>', '<title>合成验收 · ')
    }
    response.setHeader('Content-Type', allowed.get(path))
    response.end(content)
  } catch {
    response.writeHead(500).end('预览文件读取失败')
  }
})
server.listen(0, '127.0.0.1', () => console.log(`合成预览：http://127.0.0.1:${server.address().port}/popup.html`))
