import assert from 'node:assert/strict'
import { test } from 'node:test'
import { RateLimiter } from '../guangya-api.js'

test('并发请求及失败重试保持至少两秒间隔，重新实例化仍读取上次时间', async () => {
  const state = {}
  const storage = { get: async () => ({ ...state }), set: async value => Object.assign(state, value) }
  const limiter = new RateLimiter(storage)
  const times = []
  const failed = limiter.run(async () => {
    times.push(Date.now())
    throw new Error('合成失败')
  })
  const succeeded = limiter.run(async () => { times.push(Date.now()) })
  await assert.rejects(failed, /合成失败/)
  await succeeded
  const restarted = new RateLimiter(storage)
  await restarted.run(async () => { times.push(Date.now()) })
  assert.ok(times[1] - times[0] >= 2000)
  assert.ok(times[2] - times[1] >= 2000)
})
