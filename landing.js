/**
 * Sub-Store 操作脚本：落地检测改名（入口 → 落地）
 *
 * 依赖本机 http-meta：把节点交给它起临时 mihomo，穿过每个节点查 ip-api 拿真实出口。
 * 与 main.js（只查入口 server）不同，这个查的是节点真正的落地/出口。
 * 由于走本机 http-meta，检测天然反映“运行这台设备当前的网络”。
 *
 * 参数：
 *  - httpmeta       http-meta 基址，默认 http://127.0.0.1:9876
 *  - httpmeta_auth  http-meta 的 Authorization（设了 AUTHORIZATION 就必须填）
 *  - concurrency    并发，默认 8
 *  - timeout        单节点落地查询超时(ms)，默认 12000
 *  - entrance       是否在名字里带入口（入口→落地），默认 true
 *  - keep_original  落地检测失败时是否保留原名，默认 true
 *  - number         重名自动编号，默认 true
 *  - number_sep     编号分隔符，默认空格
 */
const INFO_NODE_RE = /traffic|expire|剩余|到期|重置|官网|订阅|invalid|失效|失効/i

async function operator(proxies = [], targetPlatform, context) {
  const $ = $substore
  const base = String($arguments.httpmeta || 'http://127.0.0.1:9876').replace(/\/$/, '')
  const auth = $arguments.httpmeta_auth || ''
  const concurrency = Math.max(1, Number($arguments.concurrency || 8))
  const timeout = Number($arguments.timeout || 12000)
  const withEntrance = String($arguments.entrance ?? 'true') !== 'false'
  const keepOriginal = String($arguments.keep_original ?? 'true') !== 'false'
  const numberEnabled = String($arguments.number ?? 'true') !== 'false'
  const numberSep = $arguments.number_sep ?? ' '
  const lang = $arguments.lang || 'zh-CN'
  const IPAPI = `fields=status,country,countryCode,regionName,city,isp,org,as,asname,query,hosting,proxy,mobile&lang=${lang}`

  const targets = proxies.filter(p => p && p.server && p.name && !INFO_NODE_RE.test(String(p.name)))
  if (!targets.length) return proxies

  let clash
  try {
    clash = ProxyUtils.produce(targets, 'ClashMeta', 'internal')
    if (typeof clash === 'string') clash = JSON.parse(clash)
  } catch (e) {
    $.error(`[landing] 生成 clash 代理失败: ${e?.message || e}`)
    return proxies
  }
  if (!Array.isArray(clash) || !clash.length) return proxies

  let started
  try {
    started = await httpMeta('/start', { timeout: 600000, proxies: clash })
  } catch (e) {
    $.error(`[landing] http-meta /start 失败: ${e?.message || e}`)
    return proxies
  }
  const ports = started.ports || []
  if (ports.length !== clash.length) $.info(`[landing] 端口数(${ports.length})≠节点数(${clash.length})`)

  const byName = new Map()
  for (const p of targets) if (!byName.has(String(p.name))) byName.set(String(p.name), p)
  const entCache = new Map()

  try {
    await pool(clash.map((c, i) => ({ c, i })), concurrency, async ({ c, i }) => {
      const port = ports[i]
      const orig = byName.get(String(c.name))
      if (!orig || port == null) return
      const landing = await getJson(`http://ip-api.com/json/?${IPAPI}`, `http://127.0.0.1:${port}`)
      let entrance = null
      if (withEntrance) {
        const srv = String(orig.server)
        if (!entCache.has(srv)) entCache.set(srv, await getJson(`http://ip-api.com/json/${encodeURIComponent(srv)}?${IPAPI}`, null))
        entrance = entCache.get(srv)
      }
      const nm = buildName(entrance, landing)
      if (nm) orig.name = nm
      $.info(`[landing] ${c.name} => ${orig.name}`)
    })
  } finally {
    try { await httpMeta('/stop', { pid: [started.pid] }) } catch (_) {}
  }

  if (numberEnabled) numberDuplicates()
  return proxies

  function httpMeta(path, body) {
    return $.http
      .post({ url: base + path, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) }, body: JSON.stringify(body) })
      .then(r => JSON.parse(r.body ?? r.data ?? '{}'))
  }
  function getJson(url, proxy) {
    const opt = { url, timeout }
    if (proxy) opt.proxy = proxy
    return $.http.get(opt).then(r => { try { return JSON.parse(r.body ?? r.data ?? '{}') } catch { return {} } }).catch(() => ({}))
  }
  function pool(items, n, fn) {
    let i = 0
    const run = async () => { while (i < items.length) { const k = i++; await fn(items[k]) } }
    return Promise.all(Array.from({ length: Math.min(n, items.length) }, run))
  }
  function ccFlag(cc) {
    cc = String(cc || '').toUpperCase()
    if (!/^[A-Z]{2}$/.test(cc)) return ''
    return String.fromCodePoint(...[...cc].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65))
  }
  function region(info) {
    const cc = String(info.countryCode || '').toUpperCase()
    if (cc === 'CN') return String(info.city || info.regionName || '').replace(/(特别行政区|自治区|省|市|区|县)$/i, '').trim()
    return info.country || cc || ''
  }
  function provider(info) {
    const t = [info.isp, info.org, info.asname, info.as].filter(Boolean).join(' ')
    const rules = [[/tencent|腾讯/i, '腾讯云'], [/alibaba|aliyun|阿里/i, '阿里云'], [/baidu|百度/i, '百度云'], [/huawei|华为/i, '华为云'], [/amazon|aws/i, 'AWS'], [/google/i, 'Google'], [/microsoft|azure/i, 'Azure'], [/cloudflare/i, 'CF'], [/akamai/i, 'Akamai'], [/china telecom|chinanet|电信/i, '电信'], [/china unicom|联通/i, '联通'], [/china mobile|cmnet|移动/i, '移动']]
    for (const [re, n] of rules) if (re.test(t)) return n
    return String(info.asname || info.org || info.isp || '').trim().slice(0, 24)
  }
  function label(info) {
    if (!info || info.status !== 'success') return ''
    return [region(info), provider(info)].filter(Boolean).join(' ')
  }
  function buildName(entrance, landing) {
    const L = label(landing)
    if (!L) return ''
    const flag = ccFlag(landing && landing.countryCode)
    const E = withEntrance ? label(entrance) : ''
    return `${E ? E + '→' : ''}${L} ${flag}`.trim()
  }
  function numberDuplicates() {
    const counts = new Map()
    for (const p of proxies) if (p && p.name) counts.set(p.name, (counts.get(p.name) || 0) + 1)
    const seen = new Map()
    for (const p of proxies) {
      if (!p || !p.name) continue
      if (counts.get(p.name) > 1) { const b = p.name; const n = (seen.get(b) || 0) + 1; seen.set(b, n); p.name = `${b}${numberSep}${n}` }
    }
  }
}
