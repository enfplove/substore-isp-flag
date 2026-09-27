# substore-isp-flag

Sub-Store 操作脚本，把节点名改为「入口地区+运营商 + 原节点地区旗帜」，如 `杭州电信 🇭🇰`、`美国 AWS 🇺🇸`。查的是入口 `server` 的归属，不是落地。改名后对重名节点自动编号（从 1 开始），避免内核加载时被强制去重成 (2)(3)。

在 Sub-Store 前端「脚本/操作脚本」新建脚本，粘贴 `main.js` 后对订阅执行。

## 为什么用批量端点

ip-api 免费单条端点限 **45 次/分钟**，超限返回 `HTTP 429`，持续超限封 IP 1 小时。旧版逐节点发请求，订阅一大就会大面积失败。

现在默认走 ip-api **批量端点**（`POST /batch`，一次最多 100 个 IP，限 15 次/分钟）：100 个节点从 100 次请求压到 1 次。脚本内置滑动窗口限流，并读取 `X-Rl`/`X-Ttl` 响应头，配额用尽时自动退避、遇到 429 按 `X-Ttl` 等待重试。同一入口域名/IP 的多个节点会先去重再查询。

批量端点只接受 IP，所以脚本会先做 DNS 解析拿到入口 IP 再批量查询。域名无法解析时该目标回退单条端点。设了自定义 `api` 会自动切回单条模式。

## 指定 DNS 解析

内置 DoH 解析，`dns` 参数可指定解析服务器，逗号或换行分隔，三种写法都认：

- 预设名：`aliyun` `dnspod` `cloudflare` `google` `quad9` `adguard` `opendns` `dnssb` `baidu`
- 纯 IP：`223.5.5.5`、`1.1.1.1`（内置常见公共 DNS 的 DoH 路径映射，其余按 `https://<ip>/dns-query` 尝试）
- 完整 DoH URL：`https://doh.pub/dns-query`

默认 `aliyun,dnspod,cloudflare,google`。`dns_strategy=fallback`（默认）按序回退，`race` 并发抢答。支持 `dns_type`（ipv4/ipv6/ip4p/auto）、`edns`（EDNS Client Subnet）。同一域名多条记录取字典序最小，保证多次运行命名稳定。

### 支持哪些 DNS 类型

Sub-Store 操作脚本的沙箱里只有 HTTP 客户端（`$.http`），没有原始 UDP/TCP/TLS socket，所以脚本内**只能做 DoH**。DoH 两种格式都支持：

| 写法 | 类型 | 说明 |
| --- | --- | --- |
| `https://.../resolve?name=` | DoH **JSON**（`application/dns-json`） | Cloudflare / Google / AliDNS / Quad9 等 |
| `https://.../dns-query` | DoH **wireformat**（RFC 8484，`application/dns-message`） | 标准 DoH，`GET ?dns=<base64url>`，纯 JS 编解码无依赖 |
| `tcp://` `udp://` | 明文 DNS | ❌ 需原始 socket，脚本内不可用 |
| `tls://`（DoT）`quic://`（DoQ） | 加密 DNS | ❌ 需原始 socket，脚本内不可用 |

格式选择：URL 是 `/resolve` 走 JSON，其余默认 `auto`（先按 JSON 试，失败自动回退 wireformat）。可用 `dns_format=json|wire` 全局指定，或在单个 URL 末尾加 `#json`/`#wire` 强制，例如 `https://doh.sb/dns-query#wire`。`edns` 仅在 JSON 格式下生效。

需要 TCP/UDP/DoT/DoQ 时，请先在本脚本前面加一个 Sub-Store 内置「域名解析」操作（它是核心代码，有 socket 权限，支持 `udp://`/`tcp://`/`tls://`/`https://`）；它把 `server` 改写成 IP 后，本脚本会直接复用该 IP，不再重复解析。

### 替代 Sub-Store 内置「域名解析」

设 `write_server=true`，脚本会把解析结果写回 `proxy.server`，并同步 `_domain`、`resolved`、`_IPv4`/`_IPv6`、`_IP`、`_resolved_ips`、`_IP4P` 等字段，字段契约与 Sub-Store 内置「域名解析」操作一致，可直接替代它——一步完成「指定 DNS 解析 + 入口改名」。尊重节点的 `no-resolve` 标记，`dns_filter` 支持 `removeFailed`/`IPOnly`/`IPv4Only`/`IPv6Only`。不设 `write_server` 时只用解析结果查询，不改动 `server`。

## 旗帜识别：关键词优先，emoji 兜底

旗帜先用内置地区映射表（`REGION_MAP`，100+ 国家/地区）对**原节点名**做关键词匹配。原因：实测有机场把 emoji 标错而文本是对的（如 `🇨🇳 台湾Y01`、`🇺🇲 美国Y01`），关键词优先可以自动纠正。

- 覆盖中文名、英文名（Hong Kong / Taiwan / United States…）、城市名（台北/东京/法兰克福…）和常见国家码（`US01` / `HK2` / `TW1`…）。
- 英文关键词和国家码都加了词边界，`Priority`（不再误判巴西 rio）、`Ontario`、`SE 直连`、`NO1`、`游戏加速 CH` 这类不再误标。
- 关键词全不命中时，用节点名里已有的旗帜 emoji 兜底（`emoji_fallback=true`）。这让脚本可重入：改名成 `杭州电信 🇭🇰` 后再次运行仍能刷新，而不是被永久跳过。

## 信息节点过滤

改名前先筛掉流量/到期类信息节点（`Traffic`/`Expire`/`剩余`/`到期`/`重置`/`官网`/`订阅`/`失效` 等），不查询也不改名，避免出现 `广州电信 🇬🇧`（GB 被误当英国）这类错误。

## 参数

查询：

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `batch` | `true` | 批量端点；设了 `api` 自动关闭 |
| `batch_size` | `100` | 每批 IP 数，上限 100 |
| `rate_limit` | 批量 `15` / 单条 `40` | 每分钟请求上限 |
| `api` | ip-api 单条 | 自定义模板，支持 `{{server}}`/`{{proxy.server}}`/`{{lang}}` |
| `lang` | `zh-CN` | ip-api 语言 |
| `timeout` | `5000` | 单次请求超时(ms) |
| `retries` | `1` | 失败重试次数 |
| `concurrency` | `5` | 单条模式并发 |
| `cache` | `true` | 查询结果缓存 |
| `cache_ttl` | `43200` | 缓存时长(秒)，默认 12 小时 |

改名：

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `keep_original` | `true` | 判不出旗帜时保留原名 |
| `region` | `true` | 名字带入口地区前缀 |
| `emoji_fallback` | `true` | 关键词不命中时用名字里的旗帜兜底 |
| `number` | `true` | 重名自动编号 |
| `number_sep` | 空格 | 编号分隔符 |

DNS：

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `resolve` | `true` | 查询前把域名解析成 IP |
| `dns` | `aliyun,dnspod,cloudflare,google` | 指定 DNS，预设名/IP/DoH URL，末尾可加 `#json`/`#wire` |
| `dns_format` | `auto` | `auto`/`json`/`wire`，对未带 `#` 后缀的源生效 |
| `dns_type` | `ipv4` | `ipv4`/`ipv6`/`ip4p`/`auto` |
| `dns_strategy` | `fallback` | `fallback` 按序回退 / `race` 并发抢答 |
| `dns_concurrency` | `2` | race 模式并发 DNS 数 |
| `dns_pick` | `first` | `first` 字典序最小（命名稳定）/ `random` |
| `dns_timeout` | `3000` | 单次 DoH 超时(ms) |
| `dns_cache` | `true` | DNS 缓存 |
| `dns_cache_ttl` | `3600` | DNS 缓存时长(秒) |
| `edns` | 无 | EDNS Client Subnet，如 `223.6.6.6` |
| `write_server` | `false` | 解析结果写回 `server`，替代内置「域名解析」 |
| `dns_filter` | 无 | `write_server` 时过滤：`removeFailed`/`IPOnly`/`IPv4Only`/`IPv6Only` |

## 说明

- 免费端点只走明文 **HTTP**，节点服务器地址会以明文发送给 ip-api，不允许商业用途。
- 回归测试见 `test.mjs`：`node test.mjs`（含 DoH wireformat 编解码用例）。
