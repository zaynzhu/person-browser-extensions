// 仅在用户点击连接时注入指定的光鸭官网标签页，不读取其他站点或刷新令牌。
export function readGuangyaWebSession() {
  if (location.origin !== 'https://www.guangyapan.com') return null
  try {
    const credentials = JSON.parse(localStorage.getItem('credentials_aMe-8VSlkrbQXpUR'))
    const expiresAt = Date.parse(credentials?.expires_at)
    if (typeof credentials?.access_token !== 'string' || !credentials.access_token
      || credentials.access_token.length > 16384 || /\s/.test(credentials.access_token)
      || typeof credentials.sub !== 'string' || !credentials.sub
      || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null
    return { accessToken: credentials.access_token, accountId: credentials.sub, expiresAt }
  } catch {
    return null
  }
}
