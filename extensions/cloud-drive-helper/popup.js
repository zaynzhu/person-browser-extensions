const controls = document.getElementById('controls')
const settings = document.getElementById('settings')
const browser = document.getElementById('browser')
const connectForm = document.getElementById('connectForm')
const clientIdInput = document.getElementById('clientId')
const clientSecretInput = document.getElementById('clientSecret')
const disconnectBtn = document.getElementById('disconnectBtn')
const refreshBtn = document.getElementById('refreshBtn')
const breadcrumbs = document.getElementById('breadcrumbs')
const folderList = document.getElementById('folderList')
const chooseBtn = document.getElementById('chooseBtn')
const previousBtn = document.getElementById('previousBtn')
const nextBtn = document.getElementById('nextBtn')
const status = document.getElementById('status')
const ROOT_PATH = [{ id: '', name: '根目录' }]
let currentPath = ROOT_PATH
let currentPage = 0
let busy = false
const authMode = document.getElementById('authMode')

async function send(message) {
  let response
  try {
    response = await chrome.runtime.sendMessage({ ...message, mode: authMode.value })
  } catch {
    throw new Error('扩展后台未响应，请刷新配置页后重试')
  }
  if (!response?.ok) throw new Error(response?.error || '操作失败，请重试')
  return response.data
}

function setStatus(text, isError = false) {
  status.textContent = text
  status.classList.toggle('error', isError)
}

async function run(action) {
  if (busy) return
  busy = true
  controls.disabled = true
  setStatus('正在处理…')
  try {
    await action()
  } catch (error) {
    setStatus(error.message, true)
  } finally {
    busy = false
    controls.disabled = false
  }
}

function renderTarget(target) {
  document.getElementById('savedTarget').textContent = target ? target.path.map(entry => entry.name).join(' / ') : '尚未选择'
}

function setConnected(connected) {
  browser.hidden = !connected
  disconnectBtn.hidden = !connected
  settings.open = !connected
  disconnectBtn.textContent = authMode.value === 'web' ? '断开网页登录连接（不退出官网）' : '断开并清除开发者凭证'
}

function renderFolders(data, path) {
  currentPath = path
  currentPage = data.page
  breadcrumbs.replaceChildren()
  path.forEach((entry, index) => {
    if (index) breadcrumbs.append(document.createTextNode(' / '))
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = entry.name
    if (index === path.length - 1) button.setAttribute('aria-current', 'page')
    button.addEventListener('click', () => run(() => loadFolders(path.slice(0, index + 1), 0)))
    breadcrumbs.append(button)
  })
  folderList.replaceChildren()
  data.folders.forEach(folder => {
    const row = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'folder'
    const icon = document.createElement('span')
    icon.className = 'folder-icon'
    icon.setAttribute('aria-hidden', 'true')
    icon.textContent = '▱'
    const name = document.createElement('span')
    name.className = 'folder-name'
    name.textContent = folder.name
    const arrow = document.createElement('span')
    arrow.setAttribute('aria-hidden', 'true')
    arrow.textContent = '›'
    button.append(icon, name, arrow)
    button.addEventListener('click', () => run(() => loadFolders([...path, folder], 0)))
    row.append(button)
    folderList.append(row)
  })
  folderList.scrollTop = 0
  document.getElementById('folderCount').textContent = `共 ${data.total} 个子文件夹`
  document.getElementById('emptyState').hidden = data.total !== 0
  document.getElementById('pagination').hidden = data.total <= data.pageSize && data.page === 0
  document.getElementById('pageLabel').textContent = `第 ${data.page + 1} / ${Math.max(data.page + 1, Math.ceil(data.total / data.pageSize))} 页`
  previousBtn.disabled = data.page === 0
  nextBtn.disabled = (data.page + 1) * data.pageSize >= data.total
  chooseBtn.disabled = false
}

async function loadFolders(path, page) {
  const data = await send({ type: 'list-folders', parentId: path.at(-1).id, page })
  renderFolders(data, path)
  setStatus('')
}

connectForm.addEventListener('submit', event => {
  event.preventDefault()
  run(async () => {
    const credentials = { clientId: clientIdInput.value, clientSecret: clientSecretInput.value }
    clientSecretInput.value = ''
    const data = await send({ type: 'connect', credentials })
    clientIdInput.value = ''
    setConnected(true)
    renderTarget(data.target)
    renderFolders(data.root, ROOT_PATH)
    setStatus('光鸭已连接')
  })
})

disconnectBtn.addEventListener('click', () => run(async () => {
  await send({ type: 'disconnect' })
  connectForm.reset()
  currentPath = ROOT_PATH
  currentPage = 0
  folderList.replaceChildren()
  breadcrumbs.replaceChildren()
  chooseBtn.disabled = true
  setConnected(false)
  renderTarget(null)
  setStatus('已断开，凭证和目标选择已从本机清除')
}))

refreshBtn.addEventListener('click', () => run(() => loadFolders(currentPath, 0)))
previousBtn.addEventListener('click', () => run(() => loadFolders(currentPath, currentPage - 1)))
nextBtn.addEventListener('click', () => run(() => loadFolders(currentPath, currentPage + 1)))
chooseBtn.addEventListener('click', () => run(async () => {
  const target = await send({ type: 'save-target', path: currentPath })
  renderTarget(target)
  setStatus('目标已保存')
}))

async function loadState() {
  chooseBtn.disabled = true
  folderList.replaceChildren()
  breadcrumbs.replaceChildren()
  currentPath = ROOT_PATH
  currentPage = 0
  const state = await send({ type: 'get-state' })
  setConnected(state.connected)
  renderTarget(state.target)
  if (state.connected) await loadFolders(ROOT_PATH, 0)
  else setStatus(authMode.value === 'web' ? '请在光鸭官网登录后连接' : '请先填写光鸭开发者凭证')
}

run(loadState)


authMode.addEventListener('change', () => {
  connectForm.hidden = authMode.value === 'web'
  document.getElementById('webLogin').hidden = authMode.value !== 'web'
  clientIdInput.value = ''
  clientSecretInput.value = ''
  run(loadState)
})

document.getElementById('openWebLoginBtn').addEventListener('click', () => run(async () => {
  await send({ type: 'open-web-login' })
  setStatus('请在新打开的官网完成登录，然后回到此页点击连接')
}))

document.getElementById('connectWebBtn').addEventListener('click', () => run(async () => {
  const data = await send({ type: 'connect-web' })
  setConnected(true)
  renderTarget(data.target)
  renderFolders(data.root, ROOT_PATH)
  setStatus('网页登录账号已连接')
}))

document.querySelectorAll('[data-provider]').forEach(button => {
  button.addEventListener('click', () => {
    if (busy) return
    const guangya = button.dataset.provider === 'guangya'
    document.getElementById('guangyaPanel').hidden = !guangya
    document.getElementById('pendingProvider').hidden = guangya
    document.getElementById('pendingTitle').textContent = `${button.dataset.provider} 云盘 · 待接入`
    document.querySelector('.badge').textContent = guangya ? '光鸭' : button.dataset.provider
    document.querySelectorAll('[data-provider]').forEach(item => item.setAttribute('aria-pressed', String(item === button)))
  })
})
