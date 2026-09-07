const jobId = new URLSearchParams(location.search).get('job')
const status = document.getElementById('transferStatus')
async function refresh() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'read-transfer', jobId })
    if (!response?.ok) throw new Error(response?.error || '无法读取任务状态')
    const job = response.data
    document.getElementById('transferProvider').textContent = job.provider === 'guangya' ? '光鸭' : job.provider || ''
    document.getElementById('transferTarget').textContent = job.targetPath || '尚未核对'
    status.textContent = job.message
    status.classList.toggle('error', ['failed', 'unknown'].includes(job.status))
    if (!['success', 'failed', 'unknown'].includes(job.status)) setTimeout(refresh, 1000)
  } catch (error) { status.textContent = error.message }
}
document.getElementById('openSettings').addEventListener('click', () => chrome.runtime.openOptionsPage())
refresh()
