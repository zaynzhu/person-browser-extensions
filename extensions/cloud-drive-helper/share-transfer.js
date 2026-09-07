import { request123 } from './pan123-api.js'
import { validateClient } from './pan115-api.js'

function fail(message) { return Object.assign(new Error(message), { definitive: true }) }
function safeNumber(value) {
  const number = Number(value)
  if (value === '' || !Number.isSafeInteger(number) || number < 0) throw fail('数字标识或文件大小无法精确传递，未执行转存')
  return number
}
function id(value) {
  if (!['string', 'number'].includes(typeof value) || (typeof value === 'number' && !Number.isSafeInteger(value)) || !/^[A-Za-z0-9_-]+$/.test(String(value))) throw new Error('接口标识格式异常，无法确认结果')
  return String(value)
}

async function jsonRequest(url, options = {}) {
  let response
  try {
    response = await fetch(url, { ...options, credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000) })
  } catch { throw new Error('接口请求超时或网络失败') }
  if (!response.ok) {
    const error = new Error(`接口请求失败（HTTP ${response.status}）`)
    error.definitive = response.status >= 400 && response.status < 500
    throw error
  }
  try { return await response.json() } catch { throw new Error('接口返回格式无法确认') }
}

// 在写入前读取完整的直接子项；超过本版上限则停止，不做部分转存。
async function collect(read) {
  const entries = []
  for (let page = 0; page < 100; page++) {
    const data = await read(page)
    const knownTotal = Number.isSafeInteger(data.total) && data.total >= 0
    if (!Array.isArray(data.items) || (!knownTotal && typeof data.hasMore !== 'boolean')) throw fail('列表分页结构异常，已停止')
    entries.push(...data.items)
    if ((knownTotal && entries.length >= data.total) || (!knownTotal && !data.hasMore)) {
      if ((knownTotal && entries.length !== data.total) || new Set(entries.map(item => item.id)).size !== entries.length) throw fail('列表数量或标识不一致，已停止')
      return entries
    }
    if (!data.items.length) throw fail('列表分页不完整，已停止')
  }
  throw fail('列表超过本版处理上限，未执行转存')
}

function validateNames(source, before) {
  if (!source.length) throw fail('分享中没有可转存的文件')
  if (new Set(source.map(item => item.name)).size !== source.length) throw fail('分享存在同名项目，无法准确核验，未执行转存')
  if (source.some(item => before.some(existing => existing.name === item.name))) throw fail('目标目录已有同名项目，未执行转存，避免覆盖或重复')
}

function verifyEntries(source, before, after) {
  const oldIds = new Set(before.map(item => item.id))
  return source.every(item => after.some(saved => !oldIds.has(saved.id) && saved.name === item.name && saved.folder === item.folder
    && (item.folder || saved.size === item.size)))
}

export async function executeShareTransfer({ share, target, session, limiter, with115Cookie, beforeWrite, progress }) {
  if (!target?.path?.length || target.id !== target.path.at(-1)?.id || typeof target.id !== 'string') throw fail('目标目录未配置，未执行转存')
  let readTarget, readSource, submit, checkTask, verifyTarget, verifyTree
  let shareToken
  if (share.provider === 'guangya') {
    if (!session?.accessToken || session.expiresAt <= Date.now()) throw fail('请使用光鸭网页登录连接，并在该连接下选择目标目录')
    const request = (path, body) => limiter.run(async () => {
      const result = await jsonRequest(`https://api.guangyapan.com/userres/v1/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` }, body: JSON.stringify(body),
      })
      if (!result || (result.code === undefined ? result.msg !== 'success' : result.code !== 0)) throw fail(`光鸭拒绝请求${Number.isSafeInteger(result?.code) ? `（${result.code}）` : ''}，请检查提取码、分享状态或权限`)
      return result.data
    })
    const pageEntries = data => {
      if (!Array.isArray(data?.list)) throw fail('光鸭列表格式异常')
      return { total: data.total, items: data.list.map(item => {
        if (typeof item.fileName !== 'string' || ![1, 2].includes(item.resType)) throw fail('光鸭文件信息异常')
        return { id: id(item.fileId), name: item.fileName, folder: item.resType === 2, size: String(item.fileSize ?? item.size ?? '') }
      }) }
    }
    verifyTarget = async () => {
      if (target.id === '') return
      const parentId = target.path.at(-2)?.id
      if (typeof parentId !== 'string') throw fail('光鸭目标路径不完整，未执行转存')
      const items = await collect(async page => pageEntries(await request('file/get_file_list', { parentId, page, pageSize: 100, orderBy: 0, sortType: 0 })))
      if (!items.some(item => item.id === target.id && item.folder && item.name === target.path.at(-1).name)) throw fail('光鸭目标目录无法核实，未执行转存')
    }
    readTarget = () => collect(async page => pageEntries(await request('file/get_file_list', { parentId: target.id, page, pageSize: 100, orderBy: 0, sortType: 0 })))
    readSource = async () => {
      const data = await request('get_share_access_token', { shareId: share.shareId, code: share.code })
      if (typeof data?.accessToken !== 'string' || !data.accessToken) throw fail('光鸭分享访问令牌无效')
      shareToken = data.accessToken
      return collect(async page => pageEntries(await request('get_share_page_files_list', { accessToken: shareToken, parentId: '', page, pageSize: 100, orderBy: 0, sortType: 0 })))
    }
    submit = async source => {
      const data = await request('restore_share', { accessToken: shareToken, fileIds: source.map(item => item.id), parentId: target.id })
      return id(data?.taskId)
    }
    checkTask = async taskId => {
      const data = await request('get_task_status', { taskId })
      if (data?.status === 3 || ([2, 3].includes(data?.status) && data.detail?.code)) throw fail('光鸭服务端确认转存任务失败')
      return data?.status === 2
    }
  } else if (share.provider === '123') {
    const request = (path, options = {}) => limiter.run(() => request123(path, { ...options, token: session.token }))
    const pageEntries = data => {
      if (!Array.isArray(data?.InfoList)) throw fail('123 列表格式异常')
      return { total: data.Total, hasMore: data.Next !== undefined ? String(data.Next) !== '-1' : data.InfoList.length < 100 ? false : null, items: data.InfoList.map(item => {
        if (typeof item.FileName !== 'string' || ![0, 1].includes(item.Type)) throw fail('123 文件信息异常')
        return { id: id(item.FileId), name: item.FileName, folder: item.Type === 1, size: String(item.Size ?? ''), etag: item.Etag || '' }
      }) }
    }
    const files = parentId => collect(async page => pageEntries(await request('file/list/new', { params: { driveId: 0, parentFileId: parentId, Page: page + 1, limit: 100, next: 0, trashed: false, orderBy: 'file_id', orderDirection: 'desc' } })))
    verifyTarget = async () => {
      if (!/^\d+$/.test(target.id) || !(await files('0')).some(item => item.folder && item.id === target.id && item.name === target.path.at(-1).name)) throw fail('123 目标目录无法核实，未执行转存')
    }
    readTarget = () => files(target.id)
    readSource = () => collect(async page => pageEntries(await request('share/get', { params: { shareKey: share.shareId, SharePwd: share.code, ParentFileId: 0, Page: page + 1, limit: 100, next: 0, orderBy: 'file_name', orderDirection: 'asc' } })))
    submit = async source => {
      const data = await request('restful/goapi/v1/file/copy/save', { body: {
        shareKey: share.shareId, sharePwd: share.code || null, currentLevel: 0, superAdmin: null,
        fileList: source.map(item => ({ fileID: safeNumber(item.id), fileName: item.name, size: safeNumber(item.size), etag: item.etag, type: item.folder ? 1 : 0, parentFileID: safeNumber(target.id), driveID: 0 })),
      } })
      return id(data?.taskID)
    }
    checkTask = async taskID => {
      const data = await request('restful/goapi/v1/file/copy/save/get', { params: { taskID } })
      if (Number.isInteger(data?.status) && ![0, 1, 2].includes(data.status)) throw fail('123 服务端确认转存任务失败')
      return data?.status === 2
    }
  } else if (share.provider === '115') {
    const app = validateClient(session.app)
    const origin = app === 'web' ? 'https://webapi.115.com' : 'https://proapi.115.com'
    const prefix = app === 'web' ? '' : `/${app}/2.0`
    const request = (path, params, write = false) => limiter.run(() => with115Cookie(`${origin}${prefix}${path}`, async () => {
      const url = `${origin}${prefix}${path}`
      const body = await jsonRequest(write ? url : `${url}?${new URLSearchParams(params)}`, write ? { method: 'POST', body: new URLSearchParams(params) } : {})
      if (![true, 1].includes(body?.state)) throw fail(`115 拒绝请求${body?.errno || body?.errNo || body?.code ? `（${body.errno || body.errNo || body.code}）` : ''}，未确认转存成功`)
      return body
    }))
    const entries = (list, application) => {
      if (!Array.isArray(list)) throw fail('115 列表格式异常')
      return list.map(item => {
        const folder = application ? [0, '0'].includes(item.fc) : item.fid === undefined
        const name = application ? item.fn || item.n || item.file_name : item.n || item.file_name
        if (typeof name !== 'string') throw fail(`115 ${application ? '客户端' : '分享'}文件信息异常（缺少名称字段）`)
        return { id: id(application ? item.fid : folder ? item.cid : item.fid), name, folder, size: String(item.fs ?? item.s ?? '') }
      })
    }
    const files = parentId => collect(async page => {
      const body = await request(app === 'web' ? '/files' : '/ufile/files', { cid: parentId, offset: page * 100, limit: 100, show_dir: 1, cur: 1, record_open_time: 0, format: 'json' })
      return { items: entries(body.data, app !== 'web'), total: Number(body.count) }
    })
    verifyTarget = async () => {
      if (!/^\d+$/.test(target.id) || !(await files('0')).some(item => item.folder && item.id === target.id && item.name === target.path.at(-1).name)) throw fail('115 目标目录无法核实，未执行转存')
    }
    readTarget = () => files(target.id)
    const shareFiles = parentId => collect(async page => {
      const body = await request('/share/snap', { share_code: share.shareId, receive_code: share.code, cid: parentId, limit: 100, offset: page * 100 })
      const total = Number(body.data?.count)
      if (total > 1000) throw fail('115 分享超过本版可核实的 1000 项上限，未执行转存')
      return { items: entries(body.data?.list, app !== 'web'), total }
    })
    let inspectedFolders = 0
    const sourceTree = async (parentId, depth = 0) => {
      if (depth > 30 || ++inspectedFolders > 100) throw fail('分享目录层级或数量超过核验上限，未执行转存')
      const items = await shareFiles(parentId)
      for (const item of items) if (item.folder) item.children = await sourceTree(item.id, depth + 1)
      return items
    }
    readSource = () => sourceTree('0')
    const checkChildren = async (expected, actual) => {
      for (const item of expected) {
        const saved = actual.find(entry => entry.name === item.name && entry.folder === item.folder && (item.folder || item.size === entry.size))
        if (!saved) return false
        if (item.folder && !await checkChildren(item.children, await files(saved.id))) return false
      }
      return true
    }
    verifyTree = checkChildren
    submit = async source => { await request('/share/receive', { share_code: share.shareId, receive_code: share.code, file_id: source.map(item => item.id).join(','), cid: target.id }, true); return null }
  } else throw fail('不支持的云盘')

  await progress('正在核对目标目录')
  await verifyTarget()
  const source = await readSource()
  const before = await readTarget()
  validateNames(source, before)
  await beforeWrite()
  const taskId = await submit(source)
  await progress('服务端已接收，正在核验结果')
  if (checkTask) {
    let done = false
    for (let attempt = 0; attempt < 20; attempt++) {
      if (await checkTask(taskId)) { done = true; break }
    }
    if (!done) throw new Error('服务端任务尚未确认完成')
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const after = await readTarget()
    if (verifyEntries(source, before, after) && (!verifyTree || await verifyTree(source, after))) return { count: source.length }
  }
  throw new Error('目标目录回读未能确认全部项目，可能有部分项目已转存')
}
