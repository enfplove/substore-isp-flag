const REGION_MAP = [
  { cc: 'HK', re: /香港|\bhong[\s-]*kong\b|\bhkg\b/i, bare: true },
  { cc: 'MO', re: /澳门|澳門|\bmacao\b|\bmacau\b/i, bare: true },
  { cc: 'TW', re: /台湾|台灣|\btaiwan\b|\btaipei\b|台北|新北|台中|台南|高雄|彰化|中华电信|中華電信|\bhinet\b|\bchunghwa\b/i, bare: true },
  { cc: 'CN', re: /中国(?!香港|澳门|台湾|臺灣)|大陆|內地|内地/i, bare: true },
  { cc: 'JP', re: /日本|东京|東京|大阪|埼玉|名古屋|\btokyo\b|\bosaka\b|\bjapan\b/i, bare: true },
  { cc: 'KR', re: /韩国|韓國|南韩|首尔|首爾|\bkorea\b|\bseoul\b|한국/i, bare: true },
  { cc: 'KP', re: /朝鲜|北韩|\bnorth[\s-]*korea\b/i },
  { cc: 'MN', re: /蒙古|\bmongolia\b/i },

  { cc: 'SG', re: /新加坡|狮城|獅城|\bsingapore\b/i, bare: true },
  { cc: 'MY', re: /马来西亚|馬來西亞|大马|吉隆坡|\bmalaysia\b|\bkuala[\s-]*lumpur\b/i },
  { cc: 'TH', re: /泰国|泰國|曼谷|\bthailand\b|\bbangkok\b/i },
  { cc: 'ID', re: /印度尼西亚|印尼|雅加达|\bindonesia\b|\bjakarta\b/i },
  { cc: 'PH', re: /菲律宾|菲律賓|马尼拉|\bphilippines\b|\bmanila\b/i },
  { cc: 'VN', re: /越南|\bvietnam\b|\bviet[\s-]*nam\b/i },
  { cc: 'MM', re: /缅甸|\bmyanmar\b|\bburma\b/i },
  { cc: 'KH', re: /柬埔寨|\bcambodia\b/i },
  { cc: 'LA', re: /老挝|寮国|\blaos\b/i },
  { cc: 'BN', re: /文莱|\bbrunei\b/i },

  { cc: 'IN', re: /印度(?!尼西亚)|孟买|\bindia\b|\bmumbai\b|\bchennai\b/i },
  { cc: 'PK', re: /巴基斯坦|\bpakistan\b/i },
  { cc: 'BD', re: /孟加拉|\bbangladesh\b/i },
  { cc: 'LK', re: /斯里兰卡|\bsri[\s-]*lanka\b/i },
  { cc: 'NP', re: /尼泊尔|\bnepal\b/i },
  { cc: 'MV', re: /马尔代夫|\bmaldives\b/i },

  { cc: 'AE', re: /阿联酋|阿拉伯联合酋长国|迪拜|\bdubai\b|\bemirates\b|\bu\.a\.e\.?\b/i },
  { cc: 'SA', re: /沙特|\bsaudi\b/i },
  { cc: 'QA', re: /卡塔尔|\bqatar\b/i },
  { cc: 'KW', re: /科威特|\bkuwait\b/i },
  { cc: 'BH', re: /巴林|\bbahrain\b/i },
  { cc: 'OM', re: /阿曼|\boman\b/i },
  { cc: 'IQ', re: /伊拉克|\biraq\b/i },
  { cc: 'IR', re: /伊朗|\biran\b/i },
  { cc: 'IL', re: /以色列|\bisrael\b|\btel[\s-]*aviv\b/i },
  { cc: 'JO', re: /约旦|\bjordan\b/i },
  { cc: 'TR', re: /土耳其|伊斯坦布尔|\bturkey\b|\bturkiye\b|\bistanbul\b/i },

  { cc: 'KZ', re: /哈萨克斯坦|哈萨克|阿拉木图|\bkazakhstan\b|\balmaty\b/i },
  { cc: 'UZ', re: /乌兹别克斯坦|乌兹别克|塔什干|\buzbekistan\b|\btashkent\b/i },

  { cc: 'GB', re: /英国|伦敦|\bunited[\s-]*kingdom\b|\bbritain\b|\bengland\b|\blondon\b/i, codes: ['GB', 'UK'], bare: true },
  { cc: 'DE', re: /德国|法兰克福|柏林|\bgermany\b|\bfrankfurt\b|\bberlin\b/i, bare: true },
  { cc: 'FR', re: /法国|巴黎|\bfrance\b|\bparis\b/i, bare: true },
  { cc: 'NL', re: /荷兰|阿姆斯特丹|\bnetherlands\b|\bholland\b|\bamsterdam\b/i, bare: true },
  { cc: 'IT', re: /意大利|罗马(?!尼亚)|米兰|\bitaly\b|\brome\b|\bmilan\b|\bmilano\b/i },
  { cc: 'ES', re: /西班牙|马德里|\bspain\b|\bmadrid\b/i },
  { cc: 'PT', re: /葡萄牙|里斯本|\bportugal\b|\blisbon\b/i },
  { cc: 'CH', re: /瑞士|苏黎世|\bswitzerland\b|\bzurich\b/i },
  { cc: 'SE', re: /瑞典|斯德哥尔摩|\bsweden\b|\bstockholm\b/i },
  { cc: 'NO', re: /挪威|奥斯陆|\bnorway\b|\boslo\b/i },
  { cc: 'FI', re: /芬兰|赫尔辛基|\bfinland\b|\bhelsinki\b/i },
  { cc: 'DK', re: /丹麦|哥本哈根|\bdenmark\b|\bcopenhagen\b/i },
  { cc: 'IS', re: /冰岛|\biceland\b|\breykjavik\b/i },
  { cc: 'IE', re: /爱尔兰|都柏林|\bireland\b|\bdublin\b/i },
  { cc: 'AT', re: /奥地利|维也纳|\baustria\b|\bvienna\b/i },
  { cc: 'BE', re: /比利时|布鲁塞尔|\bbelgium\b|\bbrussels\b/i },
  { cc: 'PL', re: /波兰|华沙|\bpoland\b|\bwarsaw\b/i },
  { cc: 'CZ', re: /捷克|布拉格|\bczech\w*\b|\bprague\b/i },
  { cc: 'HU', re: /匈牙利|布达佩斯|\bhungary\b|\bbudapest\b/i },
  { cc: 'RO', re: /罗马尼亚|布加勒斯特|\bromania\b|\bbucharest\b/i },
  { cc: 'BG', re: /保加利亚|索非亚|\bbulgaria\b|\bsofia\b/i },
  { cc: 'GR', re: /希腊|雅典|\bgreece\b|\bathens\b/i },
  { cc: 'LU', re: /卢森堡|\bluxembourg\b/i },
  { cc: 'MD', re: /摩尔多瓦|\bmoldova\b/i },
  { cc: 'LT', re: /立陶宛|\blithuania\b|\bvilnius\b/i },
  { cc: 'LV', re: /拉脱维亚|\blatvia\b|\briga\b/i },
  { cc: 'EE', re: /爱沙尼亚|\bestonia\b|\btallinn\b/i },
  { cc: 'RS', re: /塞尔维亚|\bserbia\b|\bbelgrade\b/i },
  { cc: 'HR', re: /克罗地亚|\bcroatia\b|\bzagreb\b/i },
  { cc: 'SI', re: /斯洛文尼亚|\bslovenia\b/i },
  { cc: 'MK', re: /北马其顿|马其顿|\bmacedonia\b/i },
  { cc: 'AL', re: /阿尔巴尼亚|\balbania\b|\btirana\b/i },
  { cc: 'GE', re: /格鲁吉亚|\bgeorgia\b|\btbilisi\b/i },
  { cc: 'AM', re: /亚美尼亚|\barmenia\b|\byerevan\b/i },
  { cc: 'UA', re: /乌克兰|基辅|\bukraine\b|\bkyiv\b|\bkiev\b/i },
  { cc: 'RU', re: /俄罗斯|莫斯科|圣彼得堡|\brussia\b|\bmoscow\b|\bsaint[\s-]*petersburg\b/i },

  {
    cc: 'US',
    re: /美国|美东|美西|硅谷|洛杉矶|圣何塞|西雅图|纽约|达拉斯|芝加哥|凤凰城|迈阿密|\bunited[\s-]*states\b|\blos[\s-]*angeles\b|\bsan[\s-]*jose\b|\bsan[\s-]*diego\b|\bsan[\s-]*francisco\b|\bseattle\b|\bchicago\b|\bdallas\b|\bmiami\b|\bhouston\b|\bnew[\s-]*york\b|\bphoenix\b|\bashburn\b|\bsilicon[\s-]*valley\b/i,
    codes: ['US', 'USA'],
    bare: true,
  },
  { cc: 'CA', re: /加拿大|多伦多|温哥华|蒙特利尔|\bcanada\b|\btoronto\b|\bvancouver\b|\bmontreal\b/i },
  { cc: 'MX', re: /墨西哥|\bmexico\b/i },
  { cc: 'PA', re: /巴拿马|\bpanama\b/i },

  { cc: 'BR', re: /巴西|圣保罗|里约|\bbrazil\b|\bbrasil\b|\bsao[\s-]*paulo\b|\brio\b/i },
  { cc: 'AR', re: /阿根廷|\bargentina\b|\bbuenos[\s-]*aires\b/i },
  { cc: 'CL', re: /智利|圣地亚哥|\bchile\b|\bsantiago\b/i },
  { cc: 'CO', re: /哥伦比亚|\bcolombia\b|\bbogota\b/i },
  { cc: 'PE', re: /秘鲁|利马|\bperu\b|\blima\b/i },
  { cc: 'EC', re: /厄瓜多尔|\becuador\b|\bquito\b/i },
  { cc: 'CR', re: /哥斯达黎加|\bcosta[\s-]*rica\b/i },
  { cc: 'UY', re: /乌拉圭|\buruguay\b|\bmontevideo\b/i },

  { cc: 'AU', re: /澳大利亚|澳洲|悉尼|墨尔本|\baustralia\b|\bsydney\b|\bmelbourne\b/i, bare: true },
  { cc: 'NZ', re: /新西兰|奥克兰|\bnew[\s-]*zealand\b|\bauckland\b/i },
  { cc: 'FJ', re: /斐济|\bfiji\b/i },

  { cc: 'ZA', re: /南非|约翰内斯堡|开普敦|\bsouth[\s-]*africa\b|\bjohannesburg\b|\bcape[\s-]*town\b/i },
  { cc: 'EG', re: /埃及|开罗|\begypt\b|\bcairo\b/i },
  { cc: 'NG', re: /尼日利亚|\bnigeria\b|\blagos\b/i },
  { cc: 'MA', re: /摩洛哥|\bmorocco\b|\bcasablanca\b/i },
  { cc: 'DZ', re: /阿尔及利亚|\balgeria\b/i },
  { cc: 'TN', re: /突尼斯|\btunisia\b/i },
  { cc: 'KE', re: /肯尼亚|\bkenya\b|\bnairobi\b/i },
  { cc: 'MU', re: /毛里求斯|\bmauritius\b/i },
  { cc: 'AO', re: /安哥拉|\bangola\b/i },
  { cc: 'CY', re: /塞浦路斯|\bcyprus\b/i },
]

const WORD_LIKE_CODES = new Set(['NO', 'IN', 'IT', 'IS', 'AT', 'BE', 'AM', 'LA', 'SA', 'CH', 'CO', 'PA', 'MY'])

const CODE_RULES = (() => {
  const out = []
  for (const entry of REGION_MAP) {
    for (const code of entry.codes || [entry.cc]) {
      if (WORD_LIKE_CODES.has(code)) continue
      out.push({
        cc: entry.cc,
        numbered: new RegExp(`\\b${code}[-_ ]?\\d{1,3}\\b`, 'i'),
        bare: entry.bare ? new RegExp(`\\b${code}\\b`) : null,
      })
    }
  }
  return out
})()

const FLAG_EMOJI_RE = /(?:\uD83C[\uDDE6-\uDDFF]){2}/

const INFO_NODE_RE = /traffic|expire|剩余|剩餘|到期|过期|重置|官网|订阅|invalid|失效|失効/i

const ANYCAST_RE = /\bcloudflare\b|\bakamai\b|\bfastly\b|\bcloudfront\b|\bg-?core\b|\bgcorelabs\b|\bincapsula\b|\bimperva\b|\bbunnycdn\b/i

const CLOUD_RULES = [
  [/\bamazon[\s-]*web[\s-]*services\b|\bamazon[\s-]*technologies\b|\bamazon\b|\baws\b/i, 'AWS'],
  [/\bmicrosoft[\s-]*azure\b|\bazure\b|\bmicrosoft\b/i, 'Azure'],
  [/\bgoogle[\s-]*fiber\b/i, 'Google Fiber'],
  [/\bgoogle[\s-]*cloud\b|\bgoogle\b/i, 'Google Cloud'],
  [/\boracle\b/i, 'Oracle Cloud'],
  [/阿里云|阿里巴巴|\balibaba\b|\baliyun\b/i, '阿里云'],
  [/腾讯云|腾讯|\btencent\b/i, '腾讯云'],
  [/华为云|华为|\bhuawei\b/i, '华为云'],
  [/百度|\bbaidu\b/i, '百度云'],
  [/金山云|\bkingsoft\b|\bksyun\b/i, '金山云'],
  [/京东云|\bjd[\s-]*cloud\b|\bjdcloud\b/i, '京东云'],
  [/火山引擎|字节跳动|\bvolcengine\b|\bvolcano[\s-]*engine\b|\bbytedance\b/i, '火山引擎'],
  [/优刻得|\bucloud\b/i, 'UCloud'],
  [/青云|\bqingcloud\b/i, '青云'],
  [/天翼云|\bctyun\b/i, '天翼云'],
  [/移动云|\bchina[\s-]*mobile[\s-]*cloud\b/i, '移动云'],
  [/联通云|沃云|\bunicom[\s-]*cloud\b/i, '联通云'],
  [/世纪互联|\b21vianet\b/i, '世纪互联'],
  [/网宿|\bwangsu\b|\bchinanetcenter\b/i, '网宿'],
  [/\bdigitalocean\b/i, 'DigitalOcean'],
  [/\bvultr\b|\bchoopa\b|\bconstant[\s-]*company\b/i, 'Vultr'],
  [/\blinode\b|\bakamai[\s-]*connected[\s-]*cloud\b/i, 'Linode'],
  [/\bhetzner\b/i, 'Hetzner'],
  [/\bovh\b/i, 'OVH'],
  [/\bcontabo\b/i, 'Contabo'],
  [/\brackspace\b/i, 'Rackspace'],
  [/\bleaseweb\b/i, 'Leaseweb'],
  [/\bupcloud\b/i, 'UpCloud'],
  [/\bscaleway\b/i, 'Scaleway'],
  [/\bibm\b|\bsoftlayer\b/i, 'IBM Cloud'],
  [/\bzenlayer\b/i, 'Zenlayer'],
  [/\bracknerd\b/i, 'RackNerd'],
  [/\bbuyvm\b|\bfrantech\b/i, 'BuyVM'],
  [/\bgreencloud\b/i, 'GreenCloud'],
  [/\bhosthatch\b/i, 'HostHatch'],
  [/\bkamatera\b/i, 'Kamatera'],
  [/\bnetcup\b/i, 'netcup'],
  [/\bm247\b/i, 'M247'],
  [/搬瓦工|\bbandwagon\b|\bit7\b/i, 'BandwagonHost'],
  [/\bmisaka\b/i, 'Misaka'],
  [/\bhurricane[\s-]*electric\b|\bhe\.net\b/i, 'Hurricane Electric'],
  [/\bcogent\b/i, 'Cogent'],
  [/\btelia\b|\barelion\b/i, 'Telia'],
  [/\bgtt\b/i, 'GTT'],
  [/\bg-?core\b|\bgcorelabs\b/i, 'Gcore'],
  [/\bcloudflare\b/i, 'Cloudflare'],
  [/\bakamai\b/i, 'Akamai'],
  [/\bfastly\b/i, 'Fastly'],
]

const CN_ISP_RULES = [
  [/长城宽带|鹏博士|\bgreat[\s-]*wall[\s-]*broadband\b|\bgwbn\b|\bdr\.?[\s-]*peng\b|\bdrpeng\b|\bpengnet\b/i, '鹏博士'],
  [/中国电信|\bchina[\s-]*telecom\b|\bchinanet\b|\bctgnet\b/i, '电信'],
  [/中国联通|\bchina[\s-]*unicom\b|\bchina169\b|\bcncgroup\b|\bcucc\b|\bunicom\b(?![\s-]*global)/i, '联通'],
  [/中国移动|\bchina[\s-]*mobile\b|\bcmnet\b|\bcmcc\b|\bcmi\b/i, '移动'],
  [/中国广电|中国广播电视|\bchina[\s-]*broadnet\b/i, '广电'],
  [/中国铁通|\bchina[\s-]*tietong\b|\bchina[\s-]*railcom\b/i, '铁通'],
  [/中国教育和科研|\bchina[\s-]*education[\s-]*and[\s-]*research\b|\bcernet\b/i, '教育网'],
]

const CARRIER_RULES = [
  [/\bcomcast\b/i, 'Comcast'],
  [/\bat&t\b|\batt[\s-]*(services|internet|corp|enterprises)\b/i, 'AT&T'],
  [/\bverizon\b/i, 'Verizon'],
  [/\bt-mobile\b/i, 'T-Mobile'],
  [/\bspectrum\b|\bcharter[\s-]*communications\b/i, 'Spectrum'],
  [/\bcenturylink\b|\blumen\b/i, 'Lumen'],
  [/\btelefonica\b|\bmovistar\b/i, 'Telefonica'],
  [/\bdeutsche[\s-]*telekom\b|\bt-online\b/i, 'Deutsche Telekom'],
  [/\bvodafone\b/i, 'Vodafone'],
  [/\bbritish[\s-]*telecom\w*\b|\bbt[\s-]*(group|internet|broadband)\b|\bbtnet\b/i, 'BT'],
  [/\borange\b(?![\s-]*(county|city|park|beach|coast|unified|walk|grove))/i, 'Orange'],
  [/\btelecom[\s-]*argentina\b/i, 'Telecom Argentina'],
  [/\bnippon[\s-]*telegraph\b|\bntt\b/i, 'NTT'],
  [/\bkddi\b/i, 'KDDI'],
  [/\bsoftbank\b/i, 'SoftBank'],
  [/\biij\b/i, 'IIJ'],
  [/\bsakura[\s-]*internet\b/i, 'SAKURA'],
  [/\bsk[\s-]*broadband\b|\bskt\b/i, 'SK Broadband'],
  [/\bkorea[\s-]*telecom\b|\bkt[\s-]*corp\w*\b/i, 'KT'],
  [/\blg[\s-]*uplus\b|\bdacom\b/i, 'LG U+'],
  [/\bpccw\b|\bhkt\b|\bhong[\s-]*kong[\s-]*telecom\b/i, 'HKT'],
  [/\bhgc\b/i, 'HGC'],
  [/\bwtt\b/i, 'WTT'],
  [/\bsingtel\b/i, 'Singtel'],
  [/\bstarhub\b/i, 'StarHub'],
  [/\bm1[\s-]*limited\b/i, 'M1'],
  [/\bchunghwa\b|\bhinet\b/i, '中华电信'],
  [/\bfar[\s-]*eastone\b/i, '远传电信'],
  [/\btaiwan[\s-]*mobile\b/i, '台湾大哥大'],
  [/\bso-?net\b/i, 'So-net'],
]

const CC_SHORT_NAME = { HK: '香港', MO: '澳门', TW: '台湾' }

const IPAPI_FIELDS = 'status,message,query,country,countryCode,city,regionName,isp,org,as,asname,mobile,proxy,hosting'
const IPAPI_BATCH_URL = 'http://ip-api.com/batch'
const IPAPI_SINGLE_URL = `http://ip-api.com/json/{{server}}`
const DOH_DEFAULT_URL = 'https://dns.alidns.com/resolve'
const USER_AGENT = 'Sub-Store-Entrance-ISP-Checker/3.0'

async function operator(proxies = [], targetPlatform, context) {
  const $ = $substore
  const args = typeof $arguments !== 'undefined' && $arguments ? $arguments : {}
  const cache = typeof scriptResourceCache !== 'undefined' ? scriptResourceCache : null

  const timeout = int(args.timeout, 5000, 1000, 120000)
  const retries = int(args.retries, 1, 0, 10)
  const concurrency = int(args.concurrency, 5, 1, 64)
  const lang = String(args.lang || 'zh-CN')
  const keepOriginal = bool(args.keep_original, true)
  const regionEnabled = bool(args.region, true)
  const emojiFallback = bool(args.emoji_fallback, true)
  const numberEnabled = bool(args.number, true)
  const numberSep = args.number_sep === undefined ? ' ' : String(args.number_sep)

  const customApi = args.api ? String(args.api) : ''
  const batchEnabled = customApi ? false : bool(args.batch, true)
  const batchSize = int(args.batch_size, 100, 1, 100)
  const rateLimit = int(args.rate_limit, batchEnabled ? 15 : 40, 1, 1000)

  const dnsEnabled = customApi ? false : bool(args.dns, true)
  const dohUrl = String(args.doh || DOH_DEFAULT_URL)

  const cacheEnabled = bool(args.cache, true) && !!cache
  const cacheTtl = int(args.cache_ttl, 43200, 60, 2592000) * 1000

  const stats = { total: proxies.length, renamed: 0, cached: 0, failed: 0, requests: 0, dns: 0 }

  const targets = []
  for (const proxy of proxies) {
    if (!proxy || !proxy.server || !proxy.name) continue
    const originalName = String(proxy.name)
    if (INFO_NODE_RE.test(originalName)) continue
    const flag = regionFlag(originalName)
    if (!flag && keepOriginal) continue
    targets.push({ proxy, originalName, flag })
  }

  const queryOf = new Map()
  const pending = new Map()
  for (const item of targets) {
    const target = String(item.proxy.server)
    item.target = target
    if (!queryOf.has(target)) queryOf.set(target, null)
  }

  for (const target of queryOf.keys()) {
    const hit = cacheEnabled ? cache.get(bodyCacheKey(target)) : null
    if (hit && typeof hit === 'object') {
      queryOf.set(target, hit)
      stats.cached++
    } else {
      pending.set(target, true)
    }
  }

  const limiter = makeLimiter(rateLimit, ms => $.wait(ms))
  const pendingList = [...pending.keys()]
  if (pendingList.length) {
    const resolvedIp = new Map()
    if (dnsEnabled) {
      const domains = pendingList.filter(t => !isIP(t))
      if (domains.length) {
        $.info(`[DNS] 用 DoH 解析 ${domains.length} 个域名入口（${dohUrl}）`)
        await pool(domains, concurrency, async domain => {
          try {
            const ip = await resolveDoh(domain)
            if (ip) resolvedIp.set(domain, ip)
          } catch (error) {
            $.error(`[DNS] ${domain} 解析失败: ${msg(error)}`)
          }
        })
      }
    }

    const queryTargetOf = new Map()
    for (const server of pendingList) {
      queryTargetOf.set(server, isIP(server) ? server : resolvedIp.get(server) || server)
    }
    const batchServers = []
    const singleServers = []
    for (const server of pendingList) {
      if (batchEnabled && isIP(queryTargetOf.get(server))) batchServers.push(server)
      else singleServers.push(server)
    }

    if (batchServers.length) {
      const ipList = [...new Set(batchServers.map(s => queryTargetOf.get(s)))]
      const chunks = chunk(ipList, batchSize)
      $.info(`[查询] 批量端点 ${ipList.length} 个 IP / ${chunks.length} 次请求（限流 ${rateLimit}/分钟）`)
      const bodyByIp = new Map()
      for (const group of chunks) {
        try {
          const list = await queryBatch(group)
          group.forEach((ip, index) => bodyByIp.set(ip, list[index]))
        } catch (error) {
          $.error(`[查询] 批量请求失败（${group.length} 个 IP）: ${msg(error)}`)
        }
      }
      for (const server of batchServers) storeBody(server, bodyByIp.get(queryTargetOf.get(server)))
    }

    if (singleServers.length) {
      if (batchEnabled) {
        $.info(`[查询] ${singleServers.length} 个域名入口未解析出 IP，改用单条端点（由 ip-api 服务端解析，可能按境外线路）`)
      } else {
        $.info(`[查询] 单条端点 ${singleServers.length} 个目标（限流 ${rateLimit}/分钟）`)
      }
      await pool(singleServers, batchEnabled ? Math.min(concurrency, 3) : concurrency, async server => {
        try {
          storeBody(server, await querySingle(queryTargetOf.get(server)))
        } catch (error) {
          $.error(`[查询] ${server} 失败: ${msg(error)}`)
        }
      })
    }
  }

  for (const item of targets) {
    const body = queryOf.get(item.target)
    if (!body) {
      stats.failed++
      continue
    }
    if (body.status === 'fail') {
      stats.failed++
      $.error(`[${item.originalName}] ${item.target} 查询失败: ${body.message || '未知原因'}`)
      continue
    }
    const provider = classifyProvider(body)
    const prefix = regionPrefix(body, provider)
    const name = `${prefix}${provider} ${item.flag}`.replace(/\s+/g, ' ').trim()
    if (!name) continue
    item.proxy.name = name
    stats.renamed++
    if (body.proxy === true) $.info(`[${item.originalName}] 入口本身被标记为代理/VPN 出口`)
    $.info(`[${item.originalName}] ${name}`)
  }

  if (numberEnabled) numberDuplicates(proxies, numberSep)

  $.info(
    `[汇总] 节点 ${stats.total} / 改名 ${stats.renamed} / 命中缓存 ${stats.cached} / 查询失败 ${stats.failed} / DoH ${stats.dns} / HTTP 请求 ${stats.requests}`
  )

  return proxies

  function storeBody(target, body) {
    if (!body || typeof body !== 'object') return
    queryOf.set(target, body)
    if (!cacheEnabled) return
    const ttl = body.status === 'fail' ? Math.min(cacheTtl, 600000) : cacheTtl
    cache.set(bodyCacheKey(target), body, ttl)
  }

  function bodyCacheKey(target) {
    const ident = batchEnabled ? `batch:${IPAPI_BATCH_URL}:${lang}` : `single:${customApi || IPAPI_SINGLE_URL}:${lang}`
    return `isp-flag:v3:${hash(ident)}:${target}`
  }

  async function resolveDoh(domain) {
    const key = `isp-flag:doh:${hash(dohUrl)}:${domain}`
    if (cacheEnabled) {
      const hit = cache.get(key)
      if (typeof hit === 'string') return hit || null
    }
    const url = `${dohUrl}${dohUrl.includes('?') ? '&' : '?'}name=${encodeURIComponent(domain)}&type=A`
    const res = await $.http.get({ url, timeout, headers: { 'user-agent': USER_AGENT, accept: 'application/dns-json' } })
    stats.dns++
    const data = parseJson(res)
    const answers = data && Array.isArray(data.Answer) ? data.Answer : []
    const ips = []
    for (const answer of answers) {
      const value = String(answer && answer.data != null ? answer.data : '')
      if (isIPv4(value)) ips.push(value)
    }
    ips.sort(compareIPv4)
    const ip = ips[0] || ''
    if (cacheEnabled) cache.set(key, ip, ip ? cacheTtl : 600000)
    return ip || null
  }

  async function queryBatch(ips) {
    const url = `${IPAPI_BATCH_URL}?fields=${IPAPI_FIELDS}&lang=${encodeURIComponent(lang)}`
    const res = await request('post', {
      url,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ips),
    })
    const data = parseJson(res)
    if (!Array.isArray(data)) throw new Error('批量端点返回的不是数组')
    const byQuery = new Map()
    for (const entry of data) if (entry && entry.query) byQuery.set(String(entry.query), entry)
    return ips.map((ip, index) => byQuery.get(ip) || data[index] || null)
  }

  async function querySingle(target) {
    const template = customApi || `${IPAPI_SINGLE_URL}?fields=${IPAPI_FIELDS}&lang={{lang}}`
    const encoded = isIP(target) ? target : encodeURIComponent(target)
    const url = template
      .replace(/\{\{\s*proxy\.server\s*\}\}/g, encoded)
      .replace(/\{\{\s*server\s*\}\}/g, encoded)
      .replace(/\{\{\s*lang\s*\}\}/g, encodeURIComponent(lang))
    const res = await request('get', { url })
    const data = parseJson(res)
    if (!data || typeof data !== 'object') throw new Error('返回内容不是 JSON')
    return data
  }

  async function request(method, options) {
    let attempt = 0
    for (;;) {
      await limiter.acquire()
      let res
      stats.requests++
      try {
        res = await $.http[method]({
          timeout,
          ...options,
          headers: { 'user-agent': USER_AGENT, ...(options.headers || {}) },
        })
      } catch (error) {
        if (attempt++ < retries) {
          await $.wait(500 * attempt)
          continue
        }
        throw error
      }
      const status = Number(res?.statusCode ?? res?.status ?? 0)
      const ttl = Number(header(res, 'x-ttl'))
      const remaining = Number(header(res, 'x-rl'))
      if (Number.isFinite(remaining) && remaining <= 0 && Number.isFinite(ttl) && ttl > 0) {
        limiter.penalize(ttl + 1)
        $.info(`[限流] 配额用尽，暂停 ${ttl + 1}s`)
      }
      if (status === 429) {
        const wait = Number.isFinite(ttl) && ttl > 0 ? ttl + 1 : 60
        limiter.penalize(wait)
        if (attempt++ < retries + 2) {
          $.info(`[限流] 收到 429，等待 ${wait}s 后重试`)
          continue
        }
        throw new Error('429 请求过于频繁')
      }
      if (status && (status < 200 || status >= 300)) {
        if (attempt++ < retries) {
          await $.wait(500 * attempt)
          continue
        }
        throw new Error(`HTTP ${status}`)
      }
      return res
    }
  }

  function regionPrefix(info, provider) {
    if (!regionEnabled) return ''
    const asText = [info.isp, info.org, info.as, info.asname].filter(Boolean).join(' ')
    if (ANYCAST_RE.test(asText)) return ''
    if (provider === '百度云') return ''
    const cc = String(info.countryCode || '').toUpperCase()
    if (cc === 'CN') {
      return String(info.city || info.regionName || '')
        .replace(/(特别行政区|自治区|省|市|区|县)$/i, '')
        .trim()
    }
    if (CC_SHORT_NAME[cc]) return `${CC_SHORT_NAME[cc]} `
    const country = String(info.country || '').trim()
    return country ? `${country} ` : ''
  }

  function classifyProvider(info) {
    const text = [info.isp, info.org, info.as, info.asname].filter(Boolean).join(' ')
    if (text) {
      for (const [rule, name] of CLOUD_RULES) if (rule.test(text)) return name
      for (const [rule, name] of CN_ISP_RULES) if (rule.test(text)) return name
      for (const [rule, name] of CARRIER_RULES) if (rule.test(text)) return name
    }
    if (info.mobile === true) return '移动网络'
    const named = String(info.org || info.isp || info.asname || '').trim()
    if (named) return named.slice(0, 24).trim()
    if (info.hosting === true) return '云厂商'
    return '未知运营商'
  }

  function regionFlag(name) {
    for (const entry of REGION_MAP) if (entry.re.test(name)) return ccFlag(entry.cc)
    for (const rule of CODE_RULES) if (rule.bare && rule.bare.test(name)) return ccFlag(rule.cc)
    for (const rule of CODE_RULES) if (rule.numbered.test(name)) return ccFlag(rule.cc)
    if (emojiFallback) {
      const matched = name.match(FLAG_EMOJI_RE)
      if (matched) return matched[0]
    }
    return ''
  }

  function parseJson(res) {
    const raw = res?.body ?? res?.data ?? res
    if (raw && typeof raw === 'object') return raw
    try {
      return JSON.parse(String(raw || ''))
    } catch (_) {
      return null
    }
  }

  function header(res, key) {
    const headers = res?.headers
    if (!headers || typeof headers !== 'object') return undefined
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() !== key) continue
      const value = headers[name]
      return Array.isArray(value) ? value[0] : value
    }
    return undefined
  }

  function pool(items, limit, worker) {
    let index = 0
    const run = async () => {
      while (index < items.length) {
        const current = items[index++]
        try {
          await worker(current)
        } catch (error) {
          $.error(`[任务] ${msg(error)}`)
        }
      }
    }
    return Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, run))
  }

  function msg(error) {
    return error?.message || String(error)
  }
}

function numberDuplicates(proxies, separator) {
  const counts = new Map()
  for (const proxy of proxies) {
    if (!proxy || !proxy.name) continue
    const name = String(proxy.name)
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  const taken = new Set()
  for (const [name, count] of counts) if (count === 1) taken.add(name)
  const cursor = new Map()
  for (const proxy of proxies) {
    if (!proxy || !proxy.name) continue
    const base = String(proxy.name)
    if ((counts.get(base) || 0) < 2) continue
    let index = cursor.get(base) || 0
    let candidate
    do {
      index += 1
      candidate = `${base}${separator}${index}`
    } while (taken.has(candidate))
    cursor.set(base, index)
    taken.add(candidate)
    proxy.name = candidate
  }
}

function makeLimiter(perMinute, wait) {
  const stamps = []
  let penaltyUntil = 0
  return {
    async acquire() {
      for (;;) {
        const now = Date.now()
        if (penaltyUntil > now) {
          await wait(penaltyUntil - now)
          continue
        }
        while (stamps.length && now - stamps[0] >= 60000) stamps.shift()
        if (stamps.length < perMinute) {
          stamps.push(now)
          return
        }
        await wait(60000 - (now - stamps[0]) + 50)
      }
    },
    penalize(seconds) {
      penaltyUntil = Math.max(penaltyUntil, Date.now() + Math.max(1, seconds) * 1000)
    },
  }
}

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

function bool(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback
  return !/^(false|0|no|off|disabled)$/i.test(String(value).trim())
}

function int(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(parsed)))
}

function ccFlag(cc) {
  const code = String(cc || '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map(char => 0x1f1e6 + char.charCodeAt(0) - 65))
}

function isIPv4(value) {
  const str = String(value || '')
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(str)) return false
  return str.split('.').every(part => Number(part) <= 255 && (part === '0' || !/^0/.test(part)))
}

function isIPv6(value) {
  const str = String(value || '').replace(/^\[|\]$/g, '')
  if (!str.includes(':')) return false
  if (!/^[0-9a-fA-F:.]+$/.test(str)) return false
  if ((str.match(/::/g) || []).length > 1) return false
  const groups = str.split(':')
  if (groups.length > 8) return false
  return groups.every(group => group === '' || /^[0-9a-fA-F]{1,4}$/.test(group) || isIPv4(group))
}

function isIP(value) {
  return isIPv4(value) || isIPv6(value)
}

function compareIPv4(a, b) {
  const pa = String(a).split('.').map(Number)
  const pb = String(b).split('.').map(Number)
  for (let i = 0; i < 4; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

function hash(input) {
  let value = 5381
  const str = String(input)
  for (let i = 0; i < str.length; i++) value = ((value << 5) + value + str.charCodeAt(i)) | 0
  return (value >>> 0).toString(36)
}
