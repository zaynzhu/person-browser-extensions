const token = new URLSearchParams(location.search).get('token')
const toggle = document.getElementById('togglePanel')
const body = document.getElementById('panelBody')
const list = document.getElementById('jobs')
const labels = { queued: '排队中', preparing: '转存中', submitting: '转存中', success: '成功', failed: '失败', unknown: '结果未确认' }
let collapsed = false
const rows = new Map()
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
    const ids = new Set(jobs.map(job => job.jobId))
    for (const [jobId, row] of rows) {
      if (!ids.has(jobId)) { row.remove(); rows.delete(jobId) }
    }
    let cursor = list.firstChild
    for (const job of jobs) {
      let row = rows.get(job.jobId)
      if (!row) {
        row = document.createElement('li')
        const heading = document.createElement('div')
        heading.className = 'job-heading'
        for (const className of ['job-label', 'job-state']) {
          const span = document.createElement('span')
          span.className = className
          heading.append(span)
        }
        row.append(heading)
        for (const className of ['job-target', 'job-message']) {
          const paragraph = document.createElement('p')
          paragraph.className = className
          row.append(paragraph)
        }
        rows.set(job.jobId, row)
      }
      row.dataset.status = job.status
      const values = {
        'job-label': `${job.provider === 'guangya' ? '光鸭' : job.provider || '分享'} · ${job.sourceLabel || new Date(job.createdAt).toLocaleTimeString()}`,
        'job-state': labels[job.status] || '等待处理',
        'job-target': job.targetPath ? `目标：${job.targetPath}` : '尚未核对目标',
        'job-message': job.message,
      }
      for (const [className, text] of Object.entries(values)) {
        const element = row.querySelector(`.${className}`)
        if (element.textContent !== text) element.textContent = text
      }
      // 状态更新保留原行及滚动位置，避免每秒整体重建引起跳动。
      if (row !== cursor) list.insertBefore(row, cursor)
      cursor = row.nextSibling
    }
  } catch (error) { document.getElementById('panelStatus').textContent = error.message }
  setTimeout(refresh, 1000)
}
refresh()
