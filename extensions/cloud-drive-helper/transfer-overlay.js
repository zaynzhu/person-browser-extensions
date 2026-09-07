// 按右键提交时才注入；任务内容放在跨源扩展 iframe，网页无法读取账号目标及历史。
export function installTransferPanel(panelUrl, token) {
  const key = '__cloudDriveTransferPanel'
  if (globalThis[key]) { globalThis[key](); return }
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'closed' })
  const frame = document.createElement('iframe')
  frame.src = panelUrl
  frame.title = '云盘转存任务'
  frame.style.cssText = 'border:0;width:100%;height:100%;display:block;background:transparent'
  host.style.cssText = 'all:initial!important;position:fixed!important;top:16px!important;right:16px!important;width:min(370px,calc(100vw - 32px))!important;height:440px!important;z-index:2147483647!important;display:block!important;border-radius:12px!important;box-shadow:0 6px 28px #0003!important;overflow:hidden!important'
  root.append(frame)
  document.documentElement.append(host)
  const expand = () => {
    if (!host.isConnected) document.documentElement.append(host)
    host.style.setProperty('height', '440px', 'important')
    frame.contentWindow.postMessage({ type: 'expand-transfer-panel', token }, '*')
  }
  globalThis[key] = expand
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.data?.token !== token || event.data?.type !== 'transfer-panel-height') return
    host.style.setProperty('height', event.data.collapsed ? '52px' : '440px', 'important')
  })
}
