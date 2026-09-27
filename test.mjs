import fs from 'fs'
import vm from 'vm'
import assert from 'assert'

const SRC = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8')

let passed = 0
let failed = 0
function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  PASS  ${name}`)
  } catch (e) {
    failed++
    console.log(`  FAIL  ${name}\n        ${e.message}`)
  }
}
async function testAsync(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  PASS  ${name}`)
  } catch (e) {
    failed++
    console.log(`  FAIL  ${name}\n        ${e.message}`)
  }
}

function makeEnv({ args = {}, http, cacheStore = new Map(), logs, clock }) {
  const log = logs || { info: [], error: [] }
  const requests = []
  const $substore = {
    info: m => log.info.push(String(m)),
    error: m => log.error.push(String(m)),
    wait: ms => new Promise(r => setTimeout(r, Math.min(ms, 5))),
    http: {
      get: opts => {
        requests.push({ method: 'get', ...opts })
        return http('get', opts)
      },
      post: opts => {
        requests.push({ method: 'post', ...opts })
        return http('post', opts)
      },
    },
  }
  const scriptResourceCache = {
    store: cacheStore,
    get(id) {
      const hit = cacheStore.get(id)
      if (!hit) return null
      if (hit.expire <= Date.now()) return null
      return hit.data
    },
    set(id, data, ttl) {
      cacheStore.set(id, { data, expire: Date.now() + (Number(ttl) || 3600000), ttl })
    },
  }
  const sandbox = {
    $substore,
    $arguments: args,
    scriptResourceCache,
    console,
    setTimeout,
    clearTimeout,
    Date: clock ? { now: () => clock.t } : Date,
    Math,
    JSON,
  }
  vm.createContext(sandbox)
  vm.runInContext(SRC + '\n;globalThis.__operator = operator;', sandbox)
  return { sandbox, operator: sandbox.__operator, log, requests, cacheStore }
}

const plain = value => JSON.parse(JSON.stringify(value))

const IPAPI = {
  '1.1.1.1': { status: 'success', query: '1.1.1.1', country: '澳大利亚', countryCode: 'AU', city: 'Sydney', isp: 'Cloudflare', org: 'Cloudflare', as: 'AS13335', asname: 'CLOUDFLARENET' },
  '203.0.113.7': { status: 'success', query: '203.0.113.7', country: '中国', countryCode: 'CN', city: '杭州市', regionName: '浙江省', isp: 'China Telecom', org: '', as: 'AS4134 Chinanet', asname: 'CHINANET-BACKBONE' },
  '198.51.100.9': { status: 'success', query: '198.51.100.9', country: '美国', countryCode: 'US', city: 'Ashburn', isp: 'Amazon.com', org: 'AWS EC2', as: 'AS16509', asname: 'AMAZON-02', hosting: true },
  '192.0.2.5': { status: 'success', query: '192.0.2.5', country: '中国香港', countryCode: 'HK', city: 'Hong Kong', isp: 'China Mobile International', org: 'CMI', as: 'AS58453', asname: 'CMI-INT-HK' },
  '10.0.0.1': { status: 'fail', query: '10.0.0.1', message: 'private range' },
}

function ipapiHandler(state = {}) {
  state.batchCalls = state.batchCalls || 0
  state.singleCalls = state.singleCalls || 0
  return (method, opts) => {
    const url = String(opts.url)
    if (method === 'post' && /\/batch/.test(url)) {
      state.batchCalls++
      const ips = JSON.parse(opts.body)
      state.lastBatchSize = ips.length
      if (state.force429 && state.batchCalls <= state.force429) {
        return Promise.resolve({ statusCode: 429, headers: { 'x-ttl': '1', 'x-rl': '0' }, body: 'rate limited' })
      }
      return Promise.resolve({
        statusCode: 200,
        headers: { 'x-rl': String(14 - state.batchCalls), 'x-ttl': '60' },
        body: JSON.stringify(ips.map(ip => IPAPI[ip] || { status: 'fail', query: ip, message: 'invalid query' })),
      })
    }
    state.singleCalls++
    const target = decodeURIComponent((url.match(/json\/([^?]*)/) || [])[1] || '')
    return Promise.resolve({
      statusCode: 200,
      headers: {},
      body: JSON.stringify(IPAPI[target] || { status: 'fail', query: target, message: 'invalid query' }),
    })
  }
}

console.log('\n=== 1. 旗帜关键词匹配（含旧版误判回归） ===')
{
  const state = {}
  const { operator } = makeEnv({ args: { cache: 'false' }, http: ipapiHandler(state) })
  const probe = async name => {
    const p = [{ name, server: '1.1.1.1' }]
    const out = await operator(p, 'Clash', {})
    return out[0].name
  }
  const cases = [
    ['Priority 01', 'Priority 01', '旧版误判巴西'],
    ['Ontario 01', 'Ontario 01', '旧版误判巴西'],
    ['Mario Relay', 'Mario Relay', '旧版误判巴西'],
    ['Clima 01', 'Clima 01', '旧版误判秘鲁'],
    ['SE 直连', 'SE 直连', '旧版误判瑞典'],
    ['MA 节点', 'MA 节点', '旧版误判摩洛哥'],
    ['AO 节点', 'AO 节点', '旧版误判安哥拉'],
    ['游戏加速 CH', '游戏加速 CH', '旧版误判瑞士'],
    ['NO1 中转', 'NO1 中转', '旧版误判挪威'],
    ['Casa de Campo', 'Casa de Campo', '小写 de 不应命中德国'],
  ]
  for (const [input, expect, why] of cases) {
    testAsync(`${why}: ${input} 保持原名`, async () => {
      const got = await probe(input)
      assert.strictEqual(got, expect)
    })
  }
}

await new Promise(r => setTimeout(r, 50))

console.log('\n=== 2. 正常旗帜识别仍然有效 ===')
await testAsync('关键词 / 国家码 / 城市名都能识别', async () => {
  const state = {}
  const { operator } = makeEnv({ args: { cache: 'false' }, http: ipapiHandler(state) })
  const proxies = [
    { name: '香港 HK01', server: '203.0.113.7' },
    { name: '台湾Y01', server: '203.0.113.7' },
    { name: '美国Y01', server: '198.51.100.9' },
    { name: 'US-CA 01', server: '198.51.100.9' },
    { name: '🇨🇳 Taiwan', server: '203.0.113.7' },
    { name: 'Tokyo 01', server: '203.0.113.7' },
    { name: 'UK01', server: '203.0.113.7' },
  ]
  const out = await operator(proxies, 'Clash', {})
  const flags = out.map(p => (p.name.match(/(?:\uD83C[\uDDE6-\uDDFF]){2}/) || [''])[0])
  assert.deepStrictEqual(flags, ['🇭🇰', '🇹🇼', '🇺🇸', '🇺🇸', '🇹🇼', '🇯🇵', '🇬🇧'])
})

console.log('\n=== 3. emoji 兜底让脚本可重入 ===')
await testAsync('第二遍喂回 杭州电信 🇭🇰 仍能刷新', async () => {
  const state = {}
  const { operator } = makeEnv({ args: { cache: 'false' }, http: ipapiHandler(state) })
  const proxies = [{ name: '杭州电信 🇭🇰', server: '203.0.113.7' }]
  const out = await operator(proxies, 'Clash', {})
  assert.strictEqual(out[0].name, '杭州电信 🇭🇰')
  assert.ok(state.batchCalls + state.singleCalls > 0, '应当真的发起过查询而不是被跳过')
})
await testAsync('emoji_fallback=false 时退回旧行为（跳过）', async () => {
  const state = {}
  const { operator } = makeEnv({ args: { cache: 'false', emoji_fallback: 'false' }, http: ipapiHandler(state) })
  const out = await operator([{ name: '杭州电信 🇭🇰', server: '203.0.113.7' }], 'Clash', {})
  assert.strictEqual(out[0].name, '杭州电信 🇭🇰')
  assert.strictEqual(state.batchCalls + state.singleCalls, 0)
})

console.log('\n=== 4. 批量端点 ===')
await testAsync('100 个节点只发 1 次请求', async () => {
  const state = {}
  const { operator } = makeEnv({ args: { cache: 'false' }, http: ipapiHandler(state) })
  const proxies = Array.from({ length: 100 }, (_, i) => ({ name: `香港 HK${i + 1}`, server: `198.51.100.9` }))
  await operator(proxies, 'Clash', {})
  assert.strictEqual(state.batchCalls, 1, `batchCalls=${state.batchCalls}`)
  assert.strictEqual(state.singleCalls, 0)
})
await testAsync('同一 server 去重后只查 1 个 IP', async () => {
  const state = {}
  const { operator } = makeEnv({ args: { cache: 'false' }, http: ipapiHandler(state) })
  const proxies = Array.from({ length: 50 }, (_, i) => ({ name: `香港 HK${i + 1}`, server: '192.0.2.5' }))
  await operator(proxies, 'Clash', {})
  assert.strictEqual(state.lastBatchSize, 1, `实际提交 ${state.lastBatchSize} 个 IP`)
})
await testAsync('250 个不同 IP 分 3 批（batch_size=100）', async () => {
  const state = {}
  const { operator } = makeEnv({ args: { cache: 'false' }, http: ipapiHandler(state) })
  const proxies = Array.from({ length: 250 }, (_, i) => ({
    name: `香港 HK${(i % 999) + 1}`,
    server: `198.51.${Math.floor(i / 250) + 100}.${i % 250}`,
  }))
  await operator(proxies, 'Clash', {})
  assert.strictEqual(state.batchCalls, 3, `batchCalls=${state.batchCalls}`)
})
await testAsync('batch=false 回退单条端点', async () => {
  const state = {}
  const { operator } = makeEnv({ args: { cache: 'false', batch: 'false' }, http: ipapiHandler(state) })
  await operator([{ name: '香港 HK1', server: '192.0.2.5' }], 'Clash', {})
  assert.strictEqual(state.batchCalls, 0)
  assert.strictEqual(state.singleCalls, 1)
})

console.log('\n=== 5. 429 与 X-Rl 退避 ===')
await testAsync('429 后按 X-Ttl 退避并重试成功', async () => {
  const state = { force429: 1 }
  const { operator, log } = makeEnv({ args: { cache: 'false' }, http: ipapiHandler(state) })
  const out = await operator([{ name: '香港 HK1', server: '192.0.2.5' }], 'Clash', {})
  assert.strictEqual(state.batchCalls, 2, `应重试一次，实际 ${state.batchCalls} 次`)
  assert.ok(out[0].name.includes('🇭🇰'))
  assert.ok(log.info.some(l => l.includes('429')), '应有 429 日志')
})

console.log('\n=== 6. 结果缓存 ===')
await testAsync('第二次运行命中缓存，不再发请求', async () => {
  const store = new Map()
  const state1 = {}
  const env1 = makeEnv({ args: {  }, http: ipapiHandler(state1), cacheStore: store })
  await env1.operator([{ name: '香港 HK1', server: '192.0.2.5' }], 'Clash', {})
  assert.strictEqual(state1.batchCalls, 1)
  const state2 = {}
  const env2 = makeEnv({ args: {  }, http: ipapiHandler(state2), cacheStore: store })
  const out = await env2.operator([{ name: '香港 HK1', server: '192.0.2.5' }], 'Clash', {})
  assert.strictEqual(state2.batchCalls, 0, '第二次不应再请求')
  assert.ok(out[0].name.includes('🇭🇰'))
})
await testAsync('cache_ttl 生效（显式写入 TTL）', async () => {
  const store = new Map()
  const state = {}
  const env = makeEnv({ args: { cache_ttl: '600' }, http: ipapiHandler(state), cacheStore: store })
  await env.operator([{ name: '香港 HK1', server: '192.0.2.5' }], 'Clash', {})
  const entry = [...store.values()][0]
  assert.strictEqual(entry.ttl, 600000, `ttl=${entry.ttl}`)
})
await testAsync('换 api 参数后缓存键不复用', async () => {
  const store = new Map()
  const s1 = {}
  const e1 = makeEnv({ args: {  }, http: ipapiHandler(s1), cacheStore: store })
  await e1.operator([{ name: '香港 HK1', server: '192.0.2.5' }], 'Clash', {})
  const s2 = {}
  const e2 = makeEnv({ args: { api: 'http://ip-api.com/json/{{server}}?lang=en' }, http: ipapiHandler(s2), cacheStore: store })
  await e2.operator([{ name: '香港 HK1', server: '192.0.2.5' }], 'Clash', {})
  assert.strictEqual(s2.singleCalls, 1, '不同 api 应重新查询')
})

console.log('\n=== 7. 重名编号不再撞名 ===')
await testAsync('已有 " 1" 后缀时不产生重复名', async () => {
  const state = {}
  const { operator } = makeEnv({ args: { cache: 'false' }, http: ipapiHandler(state) })
  const proxies = [
    { name: '杭州电信 🇭🇰 1', server: '203.0.113.7' },
    { name: '香港 HK01', server: '203.0.113.7' },
    { name: '香港 HK02', server: '203.0.113.7' },
  ]
  const out = await operator(proxies, 'Clash', {})
  const names = out.map(p => p.name)
  assert.strictEqual(new Set(names).size, names.length, `出现重复名: ${names.join(' | ')}`)
})
await testAsync('纯本地用例：三个同名 + 一个已占位', async () => {
  const state = {}
  const { sandbox } = makeEnv({ args: {}, http: ipapiHandler(state) })
  const numberDuplicates = vm.runInContext('numberDuplicates', sandbox)
  const list = [{ name: 'A 🇭🇰 1' }, { name: 'A 🇭🇰' }, { name: 'A 🇭🇰' }]
  numberDuplicates(list, ' ')
  const names = list.map(p => p.name)
  assert.deepStrictEqual(names, ['A 🇭🇰 1', 'A 🇭🇰 2', 'A 🇭🇰 3'])
})

console.log('\n=== 8. 运营商分类 ===')
await testAsync('分类结果符合预期', async () => {
  const state = {}
  const { sandbox } = makeEnv({ args: {}, http: ipapiHandler(state) })
  // classifyProvider 在 operator 作用域内，这里通过整体流程间接验证
  const { operator } = makeEnv({ args: { cache: 'false' }, http: ipapiHandler({}) })
  const out = await operator(
    [
      { name: '香港 HK1', server: '192.0.2.5' },
      { name: '美国 US1', server: '198.51.100.9' },
      { name: '杭州 CN1', server: '203.0.113.7' },
      { name: '悉尼 AU1', server: '1.1.1.1' },
    ],
    'Clash',
    {}
  )
  assert.strictEqual(out[0].name, '香港 移动 🇭🇰')
  assert.strictEqual(out[1].name, '美国 AWS 🇺🇸')
  assert.strictEqual(out[2].name, '杭州电信 🇨🇳')
  assert.strictEqual(out[3].name, 'Cloudflare 🇦🇺', 'anycast 不带地区前缀')
})

console.log('\n=== 11. 信息节点与失败兜底 ===')
await testAsync('信息节点不查询不改名', async () => {
  const state = {}
  const { operator } = makeEnv({ args: { cache: 'false' }, http: ipapiHandler(state) })
  const out = await operator(
    [
      { name: '剩余流量：100GB', server: '203.0.113.7' },
      { name: '套餐到期：2026-01-01', server: '203.0.113.7' },
      { name: '官网 example.com', server: '203.0.113.7' },
    ],
    'Clash',
    {}
  )
  assert.deepStrictEqual(out.map(p => p.name), ['剩余流量：100GB', '套餐到期：2026-01-01', '官网 example.com'])
  assert.strictEqual(state.batchCalls + state.singleCalls, 0)
})
await testAsync('查询失败保留原名', async () => {
  const state = {}
  const { operator } = makeEnv({ args: { cache: 'false' }, http: ipapiHandler(state) })
  const out = await operator([{ name: '香港 HK1', server: '10.0.0.1' }], 'Clash', {})
  assert.strictEqual(out[0].name, '香港 HK1')
})
await testAsync('HTTP 抛异常时不影响其他节点', async () => {
  const base = ipapiHandler({})
  let n = 0
  const http = (method, opts) => {
    if (method === 'post') {
      n++
      if (n === 1) return Promise.reject(new Error('socket hang up'))
    }
    return base(method, opts)
  }
  const { operator } = makeEnv({ args: { cache: 'false', retries: '0' }, http })
  const out = await operator([{ name: '香港 HK1', server: '192.0.2.5' }], 'Clash', {})
  assert.strictEqual(out[0].name, '香港 HK1')
})
await testAsync('空节点数组不报错', async () => {
  const { operator } = makeEnv({ args: {}, http: ipapiHandler({}) })
  const out = await operator([], 'Clash', {})
  assert.deepStrictEqual(out, [])
})
await testAsync('$arguments 缺失时使用默认值', async () => {
  const state = {}
  const env = makeEnv({ args: {}, http: ipapiHandler(state) })
  vm.runInContext('$arguments = undefined', env.sandbox)
  const out = await env.operator([{ name: '香港 HK1', server: '192.0.2.5' }], 'Clash', {})
  assert.ok(out[0].name.includes('🇭🇰'))
})

console.log('\n=== 12. 限流器 ===')
await testAsync('滑动窗口：达到配额后等待整窗，之后放行', async () => {
  const clock = { t: 1700000000000 }
  const { sandbox } = makeEnv({ args: {}, http: ipapiHandler({}), clock })
  const makeLimiter = vm.runInContext('makeLimiter', sandbox)
  const waits = []
  const limiter = makeLimiter(3, ms => {
    waits.push(ms)
    clock.t += ms
    return Promise.resolve()
  })
  for (let i = 0; i < 3; i++) await limiter.acquire()
  assert.strictEqual(waits.length, 0, '前 3 次不应等待')
  await limiter.acquire()
  assert.strictEqual(waits.length, 1, `第 4 次应等待一次，实际 ${waits.length}`)
  assert.ok(waits[0] > 59000 && waits[0] <= 60100, `等待时长 ${waits[0]}ms 不在整窗范围`)
})
await testAsync('penalize 按秒数暂停', async () => {
  const clock = { t: 1700000000000 }
  const { sandbox } = makeEnv({ args: {}, http: ipapiHandler({}), clock })
  const makeLimiter = vm.runInContext('makeLimiter', sandbox)
  const waits = []
  const limiter = makeLimiter(10, ms => {
    waits.push(ms)
    clock.t += ms
    return Promise.resolve()
  })
  limiter.penalize(30)
  await limiter.acquire()
  assert.strictEqual(waits.length, 1)
  assert.ok(waits[0] > 29000 && waits[0] <= 30000, `等待时长 ${waits[0]}ms`)
})

console.log('\n=== 13. 工具函数 ===')
{
  const { sandbox } = makeEnv({ args: {}, http: ipapiHandler({}) })
  const isIPv4 = vm.runInContext('isIPv4', sandbox)
  const isIPv6 = vm.runInContext('isIPv6', sandbox)
  const ccFlag = vm.runInContext('ccFlag', sandbox)
  test('isIPv4', () => {
    assert.ok(isIPv4('1.2.3.4'))
    assert.ok(isIPv4('0.0.0.0'))
    assert.ok(!isIPv4('1.2.3.256'))
    assert.ok(!isIPv4('1.2.3.04'))
    assert.ok(!isIPv4('example.com'))
  })
  test('isIPv6', () => {
    assert.ok(isIPv6('::1'))
    assert.ok(isIPv6('2606:4700::1111'))
    assert.ok(isIPv6('[2606:4700::1111]'))
    assert.ok(!isIPv6('1.2.3.4'))
    assert.ok(!isIPv6('2606::4700::1'))
  })
  test('ccFlag', () => {
    assert.strictEqual(ccFlag('HK'), '🇭🇰')
    assert.strictEqual(ccFlag('us'), '🇺🇸')
    assert.strictEqual(ccFlag('XYZ'), '')
  })
}

console.log(`\n${failed === 0 ? '全部通过' : '有失败项'}：${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
