// 缓存只服务配置页；云盘、连接方式及 115 客户端分别存储，不触发后台轮询。
export function createCachedHandler(local, handle) {
  return async message => {
    const state = await handle({ ...message, type: 'get-state' })
    const provider = message.provider || 'guangya'
    const scope = provider === '115' ? `115-${state.app || ''}` : provider === 'guangya' ? `guangya-${message.mode === 'web' ? 'web' : 'developer'}` : provider
    const key = `directoryCache-${scope}`
    let cache = (await local.get(key))[key]
    if (!state.connected || (state.connectionId && cache?.connectionId !== state.connectionId)) {
      await local.remove(key)
      cache = null
    }
    const effectiveState = cache?.invalid ? { ...state, connected: false, target: null } : state
    if (message.type === 'get-state') return { ...effectiveState, root: effectiveState.connected ? cache?.root || null : null }
    if (['list-folders', 'test-connection', 'save-target'].includes(message.type) && cache?.invalid) {
      throw Object.assign(new Error('连接已失效，请重新登录'), { authExpired: true })
    }
    // 旧配置页不得使用缓存绕过后台的连接身份校验。
    const sameConnection = !state.connectionId || message.connectionId === state.connectionId
    if (message.type === 'list-folders' && sameConnection && state.connected && !message.force
      && message.parentId === '' && message.page === 0 && cache?.root) return cache.root
    const testing = message.type === 'test-connection'
    try {
      const result = await handle(testing ? { ...message, type: 'list-folders', parentId: '', page: 0 } : message)
      const connected = message.type === 'connect' || message.type === 'connect-web' || (message.type === 'poll-qr' && result?.status === 'connected')
      if (message.type === 'disconnect') await local.remove(key)
      if (connected || testing || (message.type === 'list-folders' && message.parentId === '' && message.page === 0)) {
        const root = connected ? result.root : result
        await local.set({ [key]: { root: root || null, connectionId: connected ? result.connectionId : state.connectionId, invalid: false } })
      }
      return testing ? { connected: true, root: result } : result
    } catch (error) {
      if (error.authExpired && (testing || message.type === 'list-folders')) {
        await local.set({ [key]: { connectionId: state.connectionId, invalid: true, root: null } })
      }
      throw error
    }
  }
}
