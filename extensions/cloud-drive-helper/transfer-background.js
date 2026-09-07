import { parseShareLink } from './share-link.js'
import { executeShareTransfer } from './share-transfer.js'
import { RateLimiter } from './guangya-api.js'

const JOB_KEY = 'shareTransferJobs'
const RULE_ID = 116

export function buildTransferRule(extensionId, cookie, url) {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return {
    id: RULE_ID, priority: 1,
    action: { type: 'modifyHeaders', requestHeaders: [{ header: 'cookie', operation: 'set', value: cookie }], responseHeaders: [{ header: 'set-cookie', operation: 'remove' }] },
    condition: { regexFilter: `^${escaped}(\\?|$)`, initiatorDomains: [extensionId], resourceTypes: ['xmlhttprequest'] },
  }
}

export function createTransferService(chromeApi, getState, execute = executeShareTransfer) {
  const local = chromeApi.storage.local
  const temporary = chromeApi.storage.session
  const active = new Set()
  const queued = new Map()
  let updates = Promise.resolve()

  function update(jobId, value) {
    const pending = updates.then(async () => {
      const jobs = (await temporary.get(JOB_KEY))[JOB_KEY] || {}
      jobs[jobId] = { ...jobs[jobId], ...value }
      await temporary.set({ [JOB_KEY]: jobs })
    })
    updates = pending.catch(() => {})
    return pending
  }

  async function binding(provider) {
    const state = await local.get(['pan115SelectedApp', 'pan115Sessions', 'pan115Targets', 'pan123Session', 'pan123Target', 'guangyaWebTarget'])
    let session, target, scope, message
    if (provider === '115') {
      const app = state.pan115SelectedApp
      session = state.pan115Sessions?.[app]
      const saved = state.pan115Targets?.[app]
      target = saved?.accountId === session?.accountId ? saved?.target : null
      scope = `115-${app}`
      message = { provider, app }
    } else if (provider === '123') {
      session = state.pan123Session
      target = state.pan123Target?.accountId === session?.accountId ? state.pan123Target?.target : null
      scope = '123'
      message = { provider }
    } else {
      session = (await temporary.get('guangyaWebSession')).guangyaWebSession
      target = state.guangyaWebTarget?.accountId === session?.accountId ? state.guangyaWebTarget?.target : null
      scope = 'guangya-web'
      message = { provider: 'guangya', mode: 'web' }
    }
    const connected = await getState({ ...message, type: 'get-state' })
    if (!session || !connected.connected) throw new Error(provider === 'guangya' ? '请在光鸭“网页登录”方式连接账号并选择目标目录' : '对应云盘未连接，请先连接账号')
    if (!target?.path?.length || target.id !== target.path.at(-1)?.id) throw new Error('该连接未选择目标目录，未执行转存')
    return { session, target, scope }
  }

  async function run(jobId, info) {
    active.add(jobId)
    let writing = false
    try {
      const snapshot = queued.get(jobId)
      if (!snapshot && !info) return
      const share = snapshot?.share || parseShareLink(info.linkUrl || info.selectionText || '')
      const selected = snapshot?.selected || await binding(share.provider)
      if (JSON.stringify(await binding(share.provider)) !== JSON.stringify(selected)) throw new Error('排队期间账号或目标目录已变化，请重新提交')
      await update(jobId, { provider: share.provider, targetPath: selected.target.path.map(item => item.name).join(' / '), status: 'preparing', message: '正在准备转存' })
      const limiter = new RateLimiter(temporary, share.provider === '115' ? 'pan115LastRequestAt' : share.provider === '123' ? 'pan123LastRequestAt' : 'guangyaLastRequestAt')
      const result = await execute({
        share, ...selected, limiter,
        with115Cookie: async (url, action) => {
          await chromeApi.declarativeNetRequest.updateSessionRules({ removeRuleIds: [RULE_ID], addRules: [buildTransferRule(chromeApi.runtime.id, selected.session.cookie, url)] })
          try { return await action() }
          finally { await chromeApi.declarativeNetRequest.updateSessionRules({ removeRuleIds: [RULE_ID], addRules: [] }) }
        },
        beforeWrite: async () => {
          const current = await binding(share.provider)
          if (JSON.stringify(current) !== JSON.stringify(selected)) throw new Error('账号或目标目录已变化，未执行转存')
          // 写入前持久标记；后台中断后不得把该任务当成未执行而自动重试。
          await update(jobId, { status: 'submitting', message: '正在提交转存', writing: true })
          writing = true
        },
        progress: message => update(jobId, { message }),
      })
      await update(jobId, { status: 'success', message: `转存成功，已在目标目录核实 ${result.count} 个项目` })
      await local.remove(`directoryCache-${selected.scope}`)
    } catch (error) {
      await update(jobId, { status: writing && !error.definitive ? 'unknown' : 'failed', message: `${writing && !error.definitive ? '结果未确认' : '转存失败'}：${error.message}${writing ? '。请先检查目标目录，不要直接重复转存。' : '。未执行写入。'}` })
    } finally { active.delete(jobId); queued.delete(jobId) }
  }

  return {
    async create(info) {
      const jobId = crypto.randomUUID()
      await update(jobId, { status: 'queued', message: '等待处理', createdAt: Date.now() })
      active.add(jobId)
      if (info) {
        try {
          const share = parseShareLink(info.linkUrl || info.selectionText || '')
          const selected = await binding(share.provider)
          queued.set(jobId, { share, selected })
          await update(jobId, { provider: share.provider, sourceLabel: share.shareId, targetPath: selected.target.path.map(item => item.name).join(' / ') })
        } catch (error) {
          active.delete(jobId)
          await update(jobId, { status: 'failed', message: `提交失败：${error.message}。未执行写入。` })
        }
      }
      return jobId
    },
    run,
    async list() {
      const jobs = (await temporary.get(JOB_KEY))[JOB_KEY] || {}
      return Promise.all(Object.keys(jobs).reverse().map(async jobId => ({ jobId, ...await this.read(jobId) })))
    },
    async read(jobId) {
      const job = (await temporary.get(JOB_KEY))[JOB_KEY]?.[jobId]
      if (!job) throw new Error('任务记录不存在或浏览器已重启')
      if (!active.has(jobId) && ['queued', 'preparing', 'submitting'].includes(job.status)) return { ...job, status: job.writing ? 'unknown' : 'failed', message: job.writing ? '后台处理中断，结果未确认；请先检查目标目录，不要重复转存' : '后台处理中断，未执行写入' }
      return job
    },
  }
}
