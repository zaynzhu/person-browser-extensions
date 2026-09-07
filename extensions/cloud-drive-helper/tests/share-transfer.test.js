import assert from 'node:assert/strict'
import { test } from 'node:test'
import { executeShareTransfer } from '../share-transfer.js'
import { createTransferService, buildTransferRule } from '../transfer-background.js'

const target = { id: '42', path: [{ id: '', name: '根目录' }, { id: '42', name: '合成目标' }] }
const token = `e30.${Buffer.from(JSON.stringify({ id: '123', exp: 4102444800 })).toString('base64url')}.synthetic`
const base = provider => ({ share: { provider, shareId: 'synthetic', code: '' }, target, session: { token, accessToken: 'synthetic', expiresAt: 4102444800000, app: 'harmony' }, limiter: { run: action => action() }, beforeWrite: async () => {}, progress: async () => {}, with115Cookie: async (url, action) => action() })

for (const provider of ['guangya', '123', '115']) test(`${provider} 仅写入选定目录，任务及目录核验完成才返回成功`, async t => {
  let submitted = false
  let writes = 0
  let polled = 0
  let marked = false
  t.mock.method(globalThis, 'fetch', async (raw, options) => {
    const url = new URL(raw)
    const payload = options.body instanceof URLSearchParams ? Object.fromEntries(options.body) : options.body ? JSON.parse(options.body) : Object.fromEntries(url.searchParams)
    const file = provider === '123' ? { FileId: submitted ? 901 : 101, FileName: '合成文件', Type: 0, Size: 10, Etag: 'synthetic' } : provider === 'guangya' ? { fileId: submitted ? '901' : '101', fileName: '合成文件', resType: 1, fileSize: 10 } : { fid: submitted ? '901' : '101', fn: '合成文件', fs: '10', fc: '1' }
    let data
    if (url.pathname.endsWith('/restore_share') || url.pathname.endsWith('/copy/save') || url.pathname.endsWith('/share/receive')) {
      assert.equal(marked, true)
      assert.equal(String(payload.parentId ?? payload.cid ?? payload.fileList?.[0].parentFileID), '42')
      assert.equal(payload.fileList?.[0]?.parentFileID === undefined || typeof payload.fileList[0].parentFileID === 'number', true)
      writes++
      submitted = true
      return Response.json(provider === '115' ? { state: true } : { code: 0, data: provider === '123' ? { taskID: 'synthetic-task' } : { taskId: 'synthetic-task' } })
    }
    if (url.pathname.endsWith('/get_task_status') || url.pathname.endsWith('/copy/save/get')) {
      polled++
      return Response.json({ code: 0, data: { status: polled === 1 ? 1 : 2 } })
    }
    if (provider === 'guangya') {
      if (url.pathname.endsWith('/get_file_list') && payload.parentId === '') data = { list: [{ fileId: '42', resType: 2, fileName: '合成目标' }], total: 1 }
      else if (url.pathname.endsWith('/get_share_access_token')) data = { accessToken: 'synthetic-share' }
      else { const list = url.pathname.includes('share_page') || submitted ? [file] : []; data = { list, total: list.length } }
      return Response.json({ code: 0, data })
    }
    if (provider === '123') {
      let list
      if (payload.parentFileId === '0') list = [{ FileId: 42, FileName: '合成目标', Type: 1 }]
      else list = url.pathname.endsWith('/share/get') || submitted ? [file] : []
      return Response.json({ code: 0, data: { InfoList: list, ...(url.pathname.endsWith('/share/get') ? { Next: '-1' } : { Total: list.length }) } })
    }
    if (url.pathname.endsWith('/share/snap')) return Response.json({ state: true, data: { list: [file], count: 1 } })
    const list = payload.cid === '0' ? [{ fc: '0', fid: '42', fn: '合成目标' }] : submitted ? [{ fc: '1', fid: '901', fn: '合成文件', fs: '10' }] : []
    return Response.json({ state: true, data: list, count: list.length })
  })
  const result = await executeShareTransfer({ ...base(provider), beforeWrite: async () => { marked = true } })
  assert.equal(result.count, 1)
  assert.equal(writes, 1)
  if (provider !== '115') assert.equal(polled, 2)
})

test('目标未配置时零请求，目标身份不符时零写入', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ code: 0, data: { list: [{ fileId: '99', fileName: '其他目录', resType: 2 }], total: 1 } }) })
  await assert.rejects(executeShareTransfer({ ...base('guangya'), target: null }), /未配置/)
  assert.equal(calls, 0)
  await assert.rejects(executeShareTransfer(base('guangya')), /无法核实/)
  assert.equal(calls, 1)
})

function storage(values = {}) {
  return { values, async get(keys) { return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, structuredClone(values[key])])) }, async set(data) { Object.assign(values, structuredClone(data)) }, async remove(key) { delete values[key] } }
}

test('结果区分成功、明确失败与提交后超时，重启不重试，绑定变化不写入', async () => {
  for (const outcome of ['success', 'reject', 'timeout', 'changed']) {
    const local = storage({ pan123Session: { accountId: 'synthetic', connectionId: 'connection' }, pan123Target: { accountId: 'synthetic', target } })
    const temporary = storage()
    const chromeApi = { storage: { local, session: temporary } }
    let executeCalls = 0
    const service = createTransferService(chromeApi, async () => ({ connected: true }), async options => {
      executeCalls++
      if (outcome === 'changed') local.values.pan123Target.target = { ...target, id: '99' }
      await options.beforeWrite()
      if (outcome === 'reject') throw Object.assign(new Error('服务端拒绝'), { definitive: true })
      if (outcome === 'timeout') throw new Error('请求超时')
      return { count: 1 }
    })
    const jobId = await service.create()
    await service.run(jobId, { linkUrl: 'https://www.123pan.com/s/synthetic' })
    const job = await service.read(jobId)
    assert.equal(job.status, { success: 'success', reject: 'failed', timeout: 'unknown', changed: 'failed' }[outcome])
    assert.equal(executeCalls, 1)
    const restarted = createTransferService(chromeApi, async () => ({ connected: true }), async () => { throw new Error('不应执行') })
    assert.equal((await restarted.read(jobId)).status, job.status)
    assert.equal(JSON.stringify(temporary.values).includes('/s/synthetic'), false)
  }
})

test('115 临时 Cookie 仅匹配本扩展的单一接口，阻止前缀扩散', () => {
  const rule = buildTransferRule('synthetic-extension', 'UID=synthetic', 'https://proapi.115.com/harmony/2.0/share/receive')
  const regex = new RegExp(rule.condition.regexFilter)
  assert.ok(regex.test('https://proapi.115.com/harmony/2.0/share/receive'))
  assert.ok(!regex.test('https://proapi.115.com/harmony/2.0/share/receive-evil'))
  assert.deepEqual(rule.condition.initiatorDomains, ['synthetic-extension'])
})

test('123 同名目标不写入，服务端失败与未回读完成均不能返回成功', async t => {
  for (const scenario of ['duplicate', 'task-failed', 'missing-result', 'network']) {
    let writes = 0
    t.mock.method(globalThis, 'fetch', async (raw, options) => {
      const url = new URL(raw)
      const root = { FileId: 42, FileName: '合成目标', Type: 1 }
      const file = { FileId: 101, FileName: '合成文件', Type: 0, Size: 10, Etag: 'synthetic' }
      if (url.pathname.endsWith('/copy/save')) {
        writes++
        if (scenario === 'network') throw new Error('断网')
        return Response.json({ code: 0, data: { taskID: 'synthetic-task' } })
      }
      if (url.pathname.endsWith('/copy/save/get')) return Response.json({ code: 0, data: { status: scenario === 'task-failed' ? 3 : 2 } })
      const list = url.searchParams.get('parentFileId') === '0' ? [root] : url.pathname.endsWith('/share/get') || scenario === 'duplicate' ? [file] : []
      return Response.json({ code: 0, data: { InfoList: list, Total: list.length } })
    })
    await assert.rejects(executeShareTransfer(base('123')))
    assert.equal(writes, scenario === 'duplicate' ? 0 : 1)
    t.mock.restoreAll()
  }
})
