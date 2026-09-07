import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseShareLink } from '../share-link.js'

test('选中文字及真实链接解析提供方、分享标识和提取码', () => {
  assert.deepEqual(parseShareLink('合成分享 https://115.com/s/synthetic?password=a123'), { provider: '115', shareId: 'synthetic', code: 'a123' })
  assert.deepEqual(parseShareLink('https://www.guangyapan.com/s/synthetic 提取码：a123'), { provider: 'guangya', shareId: 'synthetic', code: 'a123' })
  assert.deepEqual(parseShareLink('https://123456.share.123pan.cn/123pan/synthetic-key'), { provider: '123', shareId: 'synthetic-key', code: '' })
  assert.deepEqual(parseShareLink('https://www.123684.com/s/synthetic.html'), { provider: '123', shareId: 'synthetic', code: '' })
})

test('拒绝伪装域名、多链接、站内跳转、脚本按钮与附带认证的 URL', () => {
  for (const text of ['https://115.com.evil.test/s/synthetic', 'https://evil.test/?url=https://115.com/s/synthetic', 'https://115.com/s/a https://115.com/s/b', 'javascript:openShare()', 'https://user@115.com/s/synthetic', 'https://115.com:8080/s/synthetic']) assert.throws(() => parseShareLink(text))
})
