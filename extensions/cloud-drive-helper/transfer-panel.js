const token = new URLSearchParams(location.search).get('token')
const toggle = document.getElementById('togglePanel')
const body = document.getElementById('panelBody')
const list = document.getElementById('jobs')
const labels = { queued: '排队中', preparing: '转存中', submitting: '转存中', success: '成功', failed: '失败', unknown: '结果未确认' }
let collapsed = false
let previous = ''
function setCollapsed(value) {
  collapsed = value
  body.hidden = collapsed
  toggle.textContent = collapsed ? '展开' : '收起'
  toggle.setAttribute('aria-expanded', String(!collapsed))
  if (token) parent.postMessage({ type: 'transfer-panel-height', token, collapsed }, '*')
}
toggle.addEventListener('click', () => setCollapsed(!collapsed))
window.addEventListener('message', event => {
  if (event.source === parent && event.data?.token === token && event.data?.type === 'expand-transfer-panel') setCollapsed(false)
})
document.getElementById('openSettings').addEventListener('click', () => chrome.runtime.openOptionsPage())
async function refresh() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'list-transfers' })
    if (!response?.ok) throw new Error(response?.error || '无法读取任务')
    const jobs = response.data
    document.getElementById('pendingCount').textContent = `· ${jobs.filter(job => ['queued', 'preparing', 'submitting'].includes(job.status)).length} 项处理中`
    document.getElementById('panelStatus').textContent = jobs.length ? '' : '暂无任务，右键分享链接即可提交。'
    const serialized = JSON.stringify(jobs)
    if (serialized !== previous) {
      previous = serialized
      const scrollTop = list.scrollTop
      list.replaceChildren(...jobs.map(job => {
        const item = document.createElement('li')
        item.dataset.status = job.status
        const heading = document.createElement('div')
        heading.className = 'job-heading'
        const label = document.createElement('span')
        label.className = 'job-label'
        label.textContent = `${job.provider === 'guangya' ? '光鸭' : job.provider || '分享'} · ${job.sourceLabel || new Date(job.createdAt).toLocaleTimeString()}`
        const state = document.createElement('span')
        state.className = 'job-state'
        state.textContent = labels[job.status] || '等待处理'
        heading.append(label, state)
        const target = document.createElement('p')
        target.className = 'job-target'
        target.textContent = job.targetPath ? `目标：${job.targetPath}` : '尚未核对目标'
        const message = document.createElement('p')
        message.className = 'job-message'
        message.textContent = job.message
        item.append(heading, target, message)
        return item
      }))
      list.scrollTop = scrollTop
    }
  } catch (error) { document.getElementById('panelStatus').textContent = error.message }
  setTimeout(refresh, 1000)
}
refresh()
