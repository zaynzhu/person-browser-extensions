const HOSTS = {
  '115.com': '115', 'www.115.com': '115', '115cdn.com': '115', 'anxia.com': '115',
  'guangyapan.com': 'guangya', 'www.guangyapan.com': 'guangya', 'app.guangyapan.com': 'guangya',
  '123pan.com': '123', 'www.123pan.com': '123', '123pan.cn': '123', 'www.123pan.cn': '123',
  '123684.com': '123', 'www.123684.com': '123', '123865.com': '123', 'www.123865.com': '123',
  '123912.com': '123', 'www.123912.com': '123', '123828.com': '123', 'www.123828.com': '123',
}

export function parseShareLink(text) {
  if (typeof text !== 'string' || text.length > 10000) throw new Error('请选择一个有效的分享链接')
  const links = [...text.matchAll(/https?:\/\/[^\s<>"'，。；）)]+/gi)].map(match => match[0])
  if (new Set(links).size !== 1) throw new Error('请一次选择一个分享链接；纯脚本按钮暂不支持直接转存')
  let url
  try { url = new URL(links[0]) } catch { throw new Error('分享链接格式无效') }
  const dedicated123 = /^\d+\.share\.123pan\.cn$/.test(url.hostname)
  const provider = dedicated123 ? '123' : HOSTS[url.hostname]
  if (!provider || url.username || url.password || url.port) throw new Error('仅支持 115、光鸭和 123 的官方分享链接')
  const match = url.pathname.match(dedicated123 ? /^\/123pan\/([A-Za-z0-9_-]+)\/?$/ : provider === 'guangya' ? /^\/(?:s|share)\/([A-Za-z0-9_-]+)\/?$/ : /^\/s\/([A-Za-z0-9_-]+)(?:\.html)?\/?$/)
  if (!match) throw new Error('未识别到分享地址，请右键分享链接本身或选中完整链接')
  const fromText = text.match(/(?:提取码|访问码|密码)\s*[:：]\s*([A-Za-z0-9]{4,8})(?![A-Za-z0-9])/)
  const code = url.searchParams.get('password') || url.searchParams.get('pwd') || url.searchParams.get('code') || fromText?.[1] || ''
  if (code && !/^[A-Za-z0-9]{4,8}$/.test(code)) throw new Error('分享提取码格式无效')
  return { provider, shareId: match[1], code }
}
