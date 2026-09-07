import { CLIENT_TYPES } from './pan115-api.js'

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
const clientType = document.getElementById('clientType')
let currentProvider = 'guangya'
let connectionId = null
let qrAttempt = null
let qrTimer = null
for (const [app, label] of Object.entries(CLIENT_TYPES)) {
  const option = document.createElement('option')
  option.value = app
  option.textContent = label
  clientType.append(option)
}

async function send(message) {
  let response
  try {
    response = await chrome.runtime.sendMessage({ provider: currentProvider, mode: authMode.value, app: clientType.value, connectionId, ...message })
  } catch {
    throw new Error('扩展后台未响应，请刷新配置页后重试')
  }
  if (!response?.ok) {
    if (response?.authExpired) { setConnected(false); renderTarget(null) }
    throw new Error(response?.error || '操作失败，请重试')
  }
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
  chooseBtn.hidden = currentProvider !== 'guangya'
  disconnectBtn.hidden = !connected
  settings.open = !connected
  document.getElementById('connectionState').textContent = connected ? '已连接' : '未连接'
  document.getElementById('testConnectionBtn').hidden = !connected
  disconnectBtn.textContent = '退出'
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
    arrow.textContent = currentProvider !== 'guangya' ? '选择' : '›'
    button.append(icon, name, arrow)
    button.addEventListener('click', () => run(async () => {
      if (currentProvider !== 'guangya') {
        const target = await send({ type: 'save-target', path: [...ROOT_PATH, folder] })
        renderTarget(target)
        setStatus('目标文件夹已保存')
      } else {
        await loadFolders([...path, folder], 0)
      }
    }))
    row.append(button)
    folderList.append(row)
  })
  folderList.scrollTop = 0
  document.getElementById('folderCount').textContent = currentProvider === '123' ? `本页 ${data.folders.length} 个文件夹` : `共 ${data.total} 个子文件夹`
  document.getElementById('emptyState').hidden = data.folders.length !== 0
  document.getElementById('emptyState').textContent = currentProvider === 'guangya' ? '此目录没有子文件夹，可以直接选用。' : '本页没有可选择的文件夹。'
  document.getElementById('pagination').hidden = data.total <= data.pageSize && data.page === 0
  document.getElementById('pageLabel').textContent = `第 ${data.page + 1} / ${Math.max(data.page + 1, Math.ceil(data.total / data.pageSize))} 页`
  previousBtn.disabled = data.page === 0
  nextBtn.disabled = (data.page + 1) * data.pageSize >= data.total
  chooseBtn.disabled = false
}

async function loadFolders(path, page, force = false) {
  const data = await send({ type: 'list-folders', parentId: path.at(-1).id, page, force })
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
  await cancelQr()
  await send({ type: 'disconnect' })
  connectionId = null
  connectForm.reset()
  document.getElementById('pan123Form').reset()
  currentPath = ROOT_PATH
  currentPage = 0
  folderList.replaceChildren()
  breadcrumbs.replaceChildren()
  chooseBtn.disabled = true
  setConnected(false)
  renderTarget(null)
  setStatus('已断开，凭证和目标选择已从本机清除')
}))

refreshBtn.addEventListener('click', () => run(() => loadFolders(currentPath, 0, true)))
previousBtn.addEventListener('click', () => run(() => loadFolders(currentPath, currentPage - 1)))
nextBtn.addEventListener('click', () => run(() => loadFolders(currentPath, currentPage + 1)))
chooseBtn.addEventListener('click', () => run(async () => {
  const target = await send({ type: 'save-target', path: currentPath })
  renderTarget(target)
  setStatus('目标已保存')
}))

async function loadState() {
  chooseBtn.disabled = true
  setConnected(false)
  renderTarget(null)
  folderList.replaceChildren()
  breadcrumbs.replaceChildren()
  currentPath = ROOT_PATH
  currentPage = 0
  const state = await send({ type: 'get-state' })
  if (currentProvider === '115') clientType.value = state.app
  connectionId = state.connectionId || null
  setConnected(state.connected)
  renderTarget(state.target)
  if (state.connected) {
    if (state.root) { renderFolders(state.root, ROOT_PATH); setStatus('已显示保存的目录，可手动刷新或测试连接') }
    else await loadFolders(ROOT_PATH, 0)
  }
  else setStatus(currentProvider === '123' ? '请输入 123 账号密码连接' : currentProvider === '115' ? '请选择客户端类型并使用手机扫码连接' : authMode.value === 'web' ? '请在光鸭官网登录后连接' : '请先填写光鸭开发者凭证')
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

function clearQr() {
  clearTimeout(qrTimer)
  qrTimer = null
  qrAttempt = null
  document.getElementById('qrPanel').hidden = true
  document.getElementById('qrImage').removeAttribute('src')
}

async function cancelQr() {
  const attempt = qrAttempt
  clearQr()
  if (attempt) await send({ type: 'cancel-qr', provider: '115', app: attempt.app, attemptId: attempt.id })
}

function schedulePoll() {
  qrTimer = setTimeout(() => {
    if (!qrAttempt) return
    if (busy) { schedulePoll(); return }
    run(async () => {
      const attempt = qrAttempt
      if (Date.now() >= attempt.expiresAt) {
        await cancelQr()
        setStatus('二维码已过期，请重新生成', true)
        return
      }
      let data
      try { data = await send({ type: 'poll-qr', attemptId: attempt.id }) }
      catch (error) { clearQr(); throw error }
      if (data.status === 'connected') {
        clearQr()
        connectionId = data.connectionId
        setConnected(true)
        renderTarget(data.target)
        if (data.root) {
          renderFolders(data.root, ROOT_PATH)
          setStatus('115 已连接，会话已保存在本机')
        } else {
          currentPath = ROOT_PATH
          currentPage = 0
          folderList.replaceChildren()
          breadcrumbs.replaceChildren()
          document.getElementById('folderCount').textContent = '尚未加载目录'
          document.getElementById('pagination').hidden = true
          document.getElementById('emptyState').hidden = true
          setStatus(`登录已保存，${data.directoryError}；可点击“刷新”重试目录`, true)
        }
      } else if (data.status === 'expired' || data.status === 'cancelled') {
        clearQr()
        setStatus(data.status === 'expired' ? '二维码已过期，请重新生成' : '手机端已取消登录')
      } else {
        document.getElementById('qrStatus').textContent = data.status === 'scanned' ? '已扫码，请在手机上确认登录' : '等待手机 115 App 扫码'
        setStatus('')
        schedulePoll()
      }
    })
  }, 3000)
}

document.getElementById('startQrBtn').addEventListener('click', () => run(async () => {
  await cancelQr()
  const data = await send({ type: 'start-qr' })
  qrAttempt = { id: data.attemptId, app: clientType.value, expiresAt: data.expiresAt }
  document.getElementById('qrImage').src = data.image
  document.getElementById('qrPanel').hidden = false
  document.getElementById('qrStatus').textContent = '等待手机 115 App 扫码'
  setStatus('请在二维码有效期内完成扫码和手机确认')
  schedulePoll()
}))

document.getElementById('cancelQrBtn').addEventListener('click', () => run(async () => {
  await cancelQr()
  setStatus('已取消扫码')
}))

clientType.addEventListener('change', () => run(async () => {
  await cancelQr()
  if (clientType.value) await send({ type: 'select-client' })
  connectionId = null
  await loadState()
}))

document.querySelectorAll('[data-provider]').forEach(button => {
  button.addEventListener('click', () => {
    if (busy) return
    run(async () => {
      await cancelQr()
      currentProvider = button.dataset.provider
      document.getElementById('pan123Login').hidden = currentProvider !== '123'
      document.getElementById('pan123Password').value = ''
      document.getElementById('pan115Login').hidden = currentProvider !== '115'
      document.getElementById('guangyaLogin').hidden = currentProvider !== 'guangya'
      const name = currentProvider === 'guangya' ? '光鸭' : currentProvider
      document.getElementById('settingsTitle').textContent = `${name}连接设置`
      browser.setAttribute('aria-label', `${name}文件夹`)
      document.querySelector('.badge').textContent = name
      document.querySelectorAll('[data-provider]').forEach(item => item.setAttribute('aria-pressed', String(item === button)))
      connectionId = null
      await loadState()
    })
  })
})


document.getElementById('pan123Form').addEventListener('submit', event => {
  event.preventDefault()
  run(async () => {
    const passwordInput = document.getElementById('pan123Password')
    const credentials = { username: document.getElementById('pan123Username').value, password: passwordInput.value }
    passwordInput.value = ''
    const data = await send({ type: 'connect', credentials })
    connectionId = data.connectionId
    setConnected(true)
    renderTarget(data.target)
    if (data.root) {
      renderFolders(data.root, ROOT_PATH)
      setStatus('123 已连接，登录令牌已保存在本机')
    } else {
      currentPath = ROOT_PATH
      currentPage = 0
      folderList.replaceChildren()
      breadcrumbs.replaceChildren()
      document.getElementById('folderCount').textContent = '尚未加载目录'
      document.getElementById('pagination').hidden = true
      document.getElementById('emptyState').hidden = true
      setStatus(`登录已保存，${data.directoryError}；可点击“刷新”重试目录`, true)
    }
  })
})


document.getElementById('testConnectionBtn').addEventListener('click', () => run(async () => {
  const data = await send({ type: 'test-connection' })
  renderFolders(data.root, ROOT_PATH)
  setStatus('连接正常，根目录已更新')
}))
