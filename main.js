/**
 * Sub-Store 操作脚本：入口运营商 + 国旗改名（批量端点版）
 *
 * 把节点名改为「入口地区+运营商 + 原节点地区旗帜」，如 杭州电信 🇭🇰、美国 AWS 🇺🇸。
 * 查的是入口 server 的归属，不是落地；落地检测见 landing.js。
 *
 * 默认走 ip-api 批量端点：100 个 IP 一次请求（单条端点是 100 次），
 * 内置滑动窗口限流 + X-Rl/X-Ttl 退避，节点再多也不会被封。
 *
 * 内置 DoH 解析并可指定 DNS；write_server=true 时把解析结果写回 proxy.server，
 * 字段与 Sub-Store 内置「域名解析」操作完全一致，可直接替代它。
 *
 * 查询参数：
 *  - batch          批量端点，默认 true（设了 api 会自动关掉）
 *  - batch_size     每批 IP 数，默认 100，上限 100
 *  - rate_limit     每分钟请求上限，默认 批量 15 / 单条 40
 *  - api            自定义单条模板，支持 {{server}} / {{proxy.server}} 占位
 *  - lang           ip-api 语言，默认 zh-CN
 *  - timeout        单次请求超时(ms)，默认 5000
 *  - retries        失败重试次数，默认 1
 *  - concurrency    单条模式并发，默认 5
 *  - cache          查询结果缓存，默认 true
 *  - cache_ttl      缓存时长(秒)，默认 43200（12 小时）
 *
 * 改名参数：
 *  - keep_original  判不出旗帜时保留原名，默认 true
 *  - region         名字带入口地区前缀，默认 true
 *  - emoji_fallback 关键词都不命中时用名字里的旗帜 emoji 兜底，默认 true
 *  - number         重名自动编号，默认 true
 *  - number_sep     编号分隔符，默认空格
 *
 * DNS 参数：
 *  - resolve        查询前把域名解析成 IP，默认 true
 *  - dns            指定 DNS，逗号或换行分隔，可写预设名 / DoH URL / 纯 IP
 *                   预设：aliyun dnspod cloudflare google quad9 adguard opendns dnssb
 *                   默认 aliyun,dnspod,cloudflare,google
 *  - dns_type       ipv4 | ipv6 | ip4p | auto，默认 ipv4
 *  - dns_strategy   fallback（按序回退）| race（并发抢答），默认 fallback
 *  - dns_concurrency  race 模式下同时打的 DNS 数，默认 2
 *  - dns_pick       first（字典序最小，命名稳定）| random，默认 first
 *  - dns_timeout    单次 DoH 超时(ms)，默认 3000
 *  - dns_cache      DNS 缓存，默认 true
 *  - dns_cache_ttl  DNS 缓存时长(秒)，默认 3600
 *  - edns           EDNS Client Subnet，如 223.6.6.6，默认不带
 *  - write_server   解析结果写回 proxy.server，替代内置「域名解析」，默认 false
 *  - dns_filter     write_server 时过滤：removeFailed | IPOnly | IPv4Only | IPv6Only
 */

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

const DOH_PRESETS = {
  aliyun: 'https://223.5.5.5/resolve',
  alidns: 'https://223.5.5.5/resolve',
  ali: 'https://223.5.5.5/resolve',
  dnspod: 'https://1.12.12.12/dns-query',
  tencent: 'https://1.12.12.12/dns-query',
  cloudflare: 'https://1.1.1.1/dns-query',
  cf: 'https://1.1.1.1/dns-query',
  google: 'https://8.8.8.8/resolve',
  quad9: 'https://9.9.9.9:5053/dns-query',
  adguard: 'https://94.140.14.14/dns-query',
  opendns: 'https://doh.opendns.com/dns-query',
  dnssb: 'https://doh.sb/dns-query',
  baidu: 'https://180.76.76.76/dns-query',
}

const DOH_BY_IP = {
  '223.5.5.5': 'https://223.5.5.5/resolve',
  '223.6.6.6': 'https://223.6.6.6/resolve',
  '1.1.1.1': 'https://1.1.1.1/dns-query',
  '1.0.0.1': 'https://1.0.0.1/dns-query',
  '8.8.8.8': 'https://8.8.8.8/resolve',
  '8.8.4.4': 'https://8.8.4.4/resolve',
  '9.9.9.9': 'https://9.9.9.9:5053/dns-query',
  '149.112.112.112': 'https://149.112.112.112:5053/dns-query',
  '1.12.12.12': 'https://1.12.12.12/dns-query',
  '119.29.29.29': 'https://1.12.12.12/dns-query',
  '120.53.53.53': 'https://120.53.53.53/dns-query',
  '180.76.76.76': 'https://180.76.76.76/dns-query',
  '94.140.14.14': 'https://94.140.14.14/dns-query',
}

const IPAPI_FIELDS = 'status,message,query,country,countryCode,city,regionName,isp,org,as,asname,mobile,proxy,hosting'
const IPAPI_BATCH_URL = 'http://ip-api.com/batch'
const IPAPI_SINGLE_URL = `http://ip-api.com/json/{{server}}`
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

  const cacheEnabled = bool(args.cache, true) && !!cache
  const cacheTtl = int(args.cache_ttl, 43200, 60, 2592000) * 1000

  const writeServer = bool(args.write_server, false)
  const resolveEnabled = bool(args.resolve, true) || writeServer
  const dnsType = normalizeDnsType(args.dns_type)
  const dnsStrategy = String(args.dns_strategy || 'fallback').toLowerCase() === 'race' ? 'race' : 'fallback'
  const dnsConcurrency = int(args.dns_concurrency, 2, 1, 16)
  const dnsPick = String(args.dns_pick || 'first').toLowerCase() === 'random' ? 'random' : 'first'
  const dnsTimeout = int(args.dns_timeout ?? args.doh_timeout, 3000, 500, 60000)
  const dnsCacheEnabled = bool(args.dns_cache, true) && !!cache
  const dnsCacheTtl = int(args.dns_cache_ttl, 3600, 30, 604800) * 1000
  const edns = args.edns && isIPv4(String(args.edns).trim()) ? String(args.edns).trim() : ''
  const dnsFilter = normalizeDnsFilter(args.dns_filter)
  const dnsSources = parseDnsSources(args.dns ?? args.doh)

  const stats = { total: proxies.length, renamed: 0, cached: 0, failed: 0, requests: 0, resolved: 0, dnsFailed: 0 }

  if (args.edns && !edns) $.error(`[参数] edns 必须是 IPv4 地址，已忽略: ${args.edns}`)
  if (resolveEnabled && !dnsSources.length) $.error('[参数] dns 未解析出可用的 DoH 源，本次跳过域名解析')

  for (const proxy of proxies) {
    if (proxy && !proxy['_no-resolve'] && proxy['no-resolve']) proxy['_no-resolve'] = proxy['no-resolve']
  }

  const targets = []
  for (const proxy of proxies) {
    if (!proxy || !proxy.server || !proxy.name) continue
    const originalName = String(proxy.name)
    if (INFO_NODE_RE.test(originalName)) continue
    const flag = regionFlag(originalName)
    if (!flag && keepOriginal) continue
    targets.push({ proxy, originalName, flag })
  }

  const resolveScope = new Set()
  if (resolveEnabled && dnsSources.length) {
    for (const item of targets) if (!item.proxy['_no-resolve'] && !isIP(item.proxy.server)) resolveScope.add(String(item.proxy.server))
    if (writeServer) {
      for (const proxy of proxies) {
        if (!proxy || !proxy.server || proxy['_no-resolve'] || isIP(proxy.server)) continue
        resolveScope.add(String(proxy.server))
      }
    }
  }

  const dnsResults = new Map()
  if (resolveScope.size) {
    const domains = [...resolveScope]
    $.info(`[DNS] ${domains.length} 个域名待解析，类型 ${dnsType}，源 ${dnsSources.map(s => s.name).join(' / ')}，策略 ${dnsStrategy}`)
    await pool(domains, concurrency, async domain => {
      const hit = dnsCacheEnabled ? cache.get(dnsCacheKey(domain)) : null
      if (Array.isArray(hit) && hit.length) {
        dnsResults.set(domain, hit)
        $.info(`[DNS] ${domain} -> ${hit.join(',')}（缓存）`)
        return
      }
      try {
        const ips = await resolveDomain(domain)
        dnsResults.set(domain, ips)
        stats.resolved++
        if (dnsCacheEnabled) cache.set(dnsCacheKey(domain), ips, dnsCacheTtl)
      } catch (error) {
        stats.dnsFailed++
        $.error(`[DNS] ${domain} 解析失败: ${msg(error)}`)
      }
    })
  }

  const queryOf = new Map()
  const pending = new Map()
  const pickedIp = new Map()
  for (const item of targets) {
    const server = String(item.proxy.server)
    const ips = dnsResults.get(server)
    let target = server
    if (ips && ips.length) {
      const picked = pickFor(server, ips)
      const ip4p = decodeIP4P(picked)
      target = ip4p ? ip4p.server : picked
    }
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
    const batchable = batchEnabled ? pendingList.filter(isIP) : []
    const single = batchEnabled ? pendingList.filter(t => !isIP(t)) : pendingList
    if (batchable.length) {
      const chunks = chunk(batchable, batchSize)
      $.info(`[查询] 批量端点 ${batchable.length} 个 IP / ${chunks.length} 次请求（限流 ${rateLimit}/分钟）`)
      for (const group of chunks) {
        try {
          const list = await queryBatch(group)
          group.forEach((target, index) => storeBody(target, list[index]))
        } catch (error) {
          $.error(`[查询] 批量请求失败（${group.length} 个 IP）: ${msg(error)}`)
        }
      }
    }
    if (single.length) {
      $.info(`[查询] 单条端点 ${single.length} 个目标（限流 ${rateLimit}/分钟）`)
      await pool(single, batchEnabled ? Math.min(concurrency, 3) : concurrency, async target => {
        try {
          storeBody(target, await querySingle(target))
        } catch (error) {
          $.error(`[查询] ${target} 失败: ${msg(error)}`)
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

  if (writeServer) {
    for (const proxy of proxies) {
      if (!proxy || !proxy.server) continue
      if (proxy['_no-resolve']) continue
      if (isIP(proxy.server)) continue
      const ips = dnsResults.get(String(proxy.server))
      if (ips && ips.length) applyResolved(proxy, ips)
      else if (!proxy.resolved) proxy.resolved = false
    }
  }

  if (numberEnabled) numberDuplicates(proxies, numberSep)

  $.info(
    `[汇总] 节点 ${stats.total} / 改名 ${stats.renamed} / 命中缓存 ${stats.cached} / 查询失败 ${stats.failed} / HTTP 请求 ${stats.requests}` +
      (resolveScope.size ? ` / DNS 成功 ${stats.resolved} 失败 ${stats.dnsFailed}` : '')
  )

  if (writeServer && dnsFilter) {
    return proxies.filter(proxy => {
      if (!proxy) return false
      if (dnsFilter === 'removeFailed') return isIP(proxy.server) || proxy['_no-resolve'] || proxy.resolved
      if (dnsFilter === 'IPOnly') return isIP(proxy.server)
      if (dnsFilter === 'IPv4Only') return isIPv4(proxy.server)
      if (dnsFilter === 'IPv6Only') return isIPv6(proxy.server)
      return true
    })
  }

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

  function dnsCacheKey(domain) {
    const ident = `${dnsSources.map(s => s.url).join('|')}|${dnsType}|${edns}`
    return `isp-flag-dns:v3:${hash(ident)}:${domain}`
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

  async function resolveDomain(domain) {
    const types = dnsType === 'auto' ? ['A', 'AAAA'] : dnsType === 'ipv4' ? ['A'] : ['AAAA']
    const errors = []
    for (const type of types) {
      try {
        return await resolveWithSources(domain, type)
      } catch (error) {
        errors.push(`${type}: ${msg(error)}`)
      }
    }
    throw new Error(errors.join('; ') || '无可用 DNS 源')
  }

  async function resolveWithSources(domain, type) {
    const errors = []
    if (dnsStrategy === 'race' && dnsSources.length > 1) {
      for (const group of chunk(dnsSources, dnsConcurrency)) {
        try {
          return await firstFulfilled(group.map(source => dohQuery(source, domain, type)))
        } catch (error) {
          errors.push(msg(error))
        }
      }
      throw new Error(errors.join('; '))
    }
    for (const source of dnsSources) {
      try {
        const ips = await dohQuery(source, domain, type)
        $.info(`[DNS] ${domain} -> ${ips.join(',')}（${source.name}）`)
        return ips
      } catch (error) {
        errors.push(`${source.name}: ${msg(error)}`)
      }
    }
    throw new Error(errors.join('; '))
  }

  async function dohQuery(source, domain, type) {
    let url
    if (/\{\{\s*domain\s*\}\}/.test(source.url)) {
      url = source.url
        .replace(/\{\{\s*domain\s*\}\}/g, encodeURIComponent(domain))
        .replace(/\{\{\s*type\s*\}\}/g, type)
    } else {
      const params = [`name=${encodeURIComponent(domain)}`, `type=${type}`]
      if (edns) params.push(`edns_client_subnet=${encodeURIComponent(edns)}`)
      url = `${source.url}${source.url.includes('?') ? '&' : '?'}${params.join('&')}`
    }
    const res = await $.http.get({
      url,
      timeout: dnsTimeout,
      headers: { accept: 'application/dns-json', 'user-agent': USER_AGENT },
    })
    const status = Number(res?.statusCode ?? res?.status ?? 0)
    if (status && (status < 200 || status >= 300)) throw new Error(`HTTP ${status}`)
    const data = parseJson(res)
    if (!data || typeof data !== 'object') throw new Error('返回内容不是 JSON')
    if (data.Status !== undefined && Number(data.Status) !== 0) throw new Error(`DNS Status=${data.Status}`)
    const wantType = type === 'AAAA' ? 28 : 1
    const ips = []
    for (const answer of data.Answer || []) {
      if (!answer) continue
      const answerType = Number(answer.type)
      const typeName = String(answer.type || '').toUpperCase()
      if (answerType !== wantType && typeName !== type) continue
      const ip = String(answer.data || '').trim()
      const ok = type === 'AAAA' ? isIPv6(ip) : isIPv4(ip) && ip !== '0.0.0.0'
      if (ok && !ips.includes(ip)) ips.push(ip)
    }
    if (!ips.length) throw new Error('无有效记录')
    return ips.sort()
  }

  function pickFor(domain, ips) {
    if (pickedIp.has(domain)) return pickedIp.get(domain)
    const ip = dnsPick === 'random' ? ips[Math.floor(Math.random() * ips.length)] : ips.slice().sort()[0]
    pickedIp.set(domain, ip)
    return ip
  }

  function applyResolved(proxy, ips) {
    proxy._resolved_ips = ips.slice()
    const ip = pickFor(String(proxy.server), ips)
    if (isIPv6(ip)) {
      const ip4p = decodeIP4P(ip)
      if (ip4p) {
        proxy._IP4P = ip
        proxy._domain = proxy.server
        proxy.server = ip4p.server
        proxy.port = ip4p.port
        proxy.resolved = true
        proxy._IPv4 = ip4p.server
        if (!isIP(proxy._IP)) proxy._IP = ip4p.server
        return
      }
      proxy._domain = proxy.server
      proxy.server = ip
      proxy.resolved = true
      proxy._IPv6 = ip
      if (!isIP(proxy._IP)) proxy._IP = ip
      return
    }
    proxy._domain = proxy.server
    proxy.server = ip
    proxy.resolved = true
    proxy._IPv4 = ip
    if (!isIP(proxy._IP)) proxy._IP = ip
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
    if (!text) return info.hosting === true ? '云厂商' : '未知运营商'
    for (const [rule, name] of CLOUD_RULES) if (rule.test(text)) return name
    for (const [rule, name] of CN_ISP_RULES) if (rule.test(text)) return name
    for (const [rule, name] of CARRIER_RULES) if (rule.test(text)) return name
    if (info.mobile === true) return '移动网络'
    if (info.hosting === true) return '云厂商'
    const fallback = String(info.asname || info.org || info.isp || '').trim()
    return fallback.slice(0, 24).trim() || '未知运营商'
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

  function parseDnsSources(raw) {
    const input = raw === undefined || raw === null || String(raw).trim() === '' ? 'aliyun,dnspod,cloudflare,google' : String(raw)
    const seen = new Set()
    const sources = []
    for (const token of input.split(/[,\n\r]+/)) {
      const name = token.trim()
      if (!name) continue
      const url = dnsTokenToUrl(name)
      if (!url || seen.has(url)) continue
      seen.add(url)
      sources.push({ name, url })
    }
    return sources
  }

  function dnsTokenToUrl(token) {
    if (/^https?:\/\//i.test(token)) return token
    const scheme = token.match(/^([a-z][a-z\d+.-]*):\/\//i)
    let body = token
    if (scheme) {
      body = token.slice(scheme[0].length)
      $.info(`[DNS] 脚本内只支持 DoH，${scheme[1]}:// 已按 DoH 处理: ${token}`)
    }
    body = body.replace(/\/+$/, '')
    const preset = DOH_PRESETS[body.toLowerCase()]
    if (preset) return preset
    const host = body.replace(/^\[|\]$/g, '').split('/')[0]
    if (DOH_BY_IP[host]) return DOH_BY_IP[host]
    if (isIP(host)) {
      $.info(`[DNS] ${host} 未知 DoH 路径，按 https://${host}/dns-query 尝试`)
      return `https://${host}/dns-query`
    }
    if (/^[a-z\d.-]+\.[a-z]{2,}$/i.test(body)) return `https://${body}/dns-query`
    $.error(`[DNS] 无法识别的 DNS 配置，已跳过: ${token}`)
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

function firstFulfilled(promises) {
  return new Promise((resolve, reject) => {
    let remaining = promises.length
    const errors = []
    if (!remaining) {
      reject(new Error('无可用来源'))
      return
    }
    for (const promise of promises) {
      promise.then(resolve, error => {
        errors.push(error?.message || String(error))
        remaining -= 1
        if (remaining === 0) reject(new Error(errors.join('; ')))
      })
    }
  })
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

function normalizeDnsType(value) {  const type = String(value || 'ipv4').toLowerCase()
  if (['ipv6', 'aaaa', '6'].includes(type)) return 'ipv6'
  if (['ip4p'].includes(type)) return 'ip4p'
  if (['auto', 'both', 'all'].includes(type)) return 'auto'
  return 'ipv4'
}

function normalizeDnsFilter(value) {
  const filter = String(value || '').trim().toLowerCase()
  if (filter === 'removefailed') return 'removeFailed'
  if (filter === 'iponly') return 'IPOnly'
  if (filter === 'ipv4only') return 'IPv4Only'
  if (filter === 'ipv6only') return 'IPv6Only'
  return ''
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

function decodeIP4P(value) {
  const str = String(value || '').replace(/^\[|\]$/g, '')
  if (!/^2001::[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}$/.test(str)) return null
  const parts = str.split(':')
  const port = parseInt(parts[2], 16)
  const high = parseInt(parts[3], 16)
  const low = parseInt(parts[4], 16)
  if (!Number.isFinite(port) || port <= 0 || port > 65535) return null
  const server = `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`
  if (!isIPv4(server)) return null
  return { server, port }
}

function hash(input) {
  let value = 5381
  const str = String(input)
  for (let i = 0; i < str.length; i++) value = ((value << 5) + value + str.charCodeAt(i)) | 0
  return (value >>> 0).toString(36)
}
