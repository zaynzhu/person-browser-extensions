<div align="center">

# ✦ Browser Search Extensions

**浏览器右键搜索扩展合集** · 选中文字，右键一搜，影视资源触手可及

[![GitHub Stars](https://img.shields.io/github/stars/zaynzhu/zaynzhu-browser-extensions?style=flat&logo=github&color=yellow&label=Stars)](https://github.com/zaynzhu/zaynzhu-browser-extensions/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/zaynzhu/zaynzhu-browser-extensions?style=flat&logo=github&color=purple&label=Forks)](https://github.com/zaynzhu/zaynzhu-browser-extensions/network)
[![Last Commit](https://img.shields.io/github/last-commit/zaynzhu/zaynzhu-browser-extensions?logo=github&label=Last%20Commit)](https://github.com/zaynzhu/zaynzhu-browser-extensions/commits/main)
[![Extensions](https://img.shields.io/badge/Extensions-16-6366f1?style=flat&logo=googlechrome&logoColor=white)](./extensions/)
[![Manifest](https://img.shields.io/badge/Manifest-V3-4EAA25?style=flat&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![License](https://img.shields.io/badge/License-MIT-0ea5e9?style=flat&logo=opensourceinitiative&logoColor=white)](./LICENSE)

</div>

---

## 扩展索引

| &nbsp; | 扩展 | 目标网站 | 简介 | 状态 |
|:------:|------|----------|------|:----:|
| 🐝 | [**HDHive Search**](./extensions/hdhive-search/) | [hdhive.com](https://hdhive.com) | 基于 TMDB 的影视资料聚合搜索（电影+剧集），支持自定义搜索主页 | `stable` |
| 📖 | [**Douban Search**](./extensions/douban-search/) | [search.douban.com](https://search.douban.com) | 豆瓣影视评分搜索 | `stable` |
| ☁️ | [**123盘 Search**](./extensions/123pan-search/) | [us.pan1.me](https://us.pan1.me) | 123 云盘资源分享社区搜索 | `stable` |
| 🔍 | [**XCili Search**](./extensions/xcili-search/) | [xcili.com](https://xcili.com) | 磁力链接搜索，弹窗展示结果，支持一键复制磁力链接 | `stable` |
| 🔎 | [**Mukaku Search**](./extensions/mukaku-search/) | [web2.mukaku.com](https://web2.mukaku.com) | 不太灵磁力搜索，支持自定义搜索主页（域名经常变更） | `stable` |
| 🧲 | [**KuakeQ Search**](./extensions/kuakeq-search/) | [kuakeq.com](https://www.kuakeq.com) | 夸克圈磁力搜索，支持自定义搜索主页 | `stable` |
| 🎩 | [**Jiaofu Search**](./extensions/jiaofu-search/) | [观影站](https://www.xn--wcv59z.com) | 观影站影视资源搜索，支持自定义搜索主页 | `stable` |
| 💬 | [**SubHD Search**](./extensions/subhd-search/) | [subhd.tv](https://subhd.tv) | SubHD 字幕搜索，支持自定义搜索主页 | `stable` |
| 📡 | [**TTD Search**](./extensions/tgtodrive-search/) | NAS 自建 TgtoDrive | 在 TgtoDrive 影视探索页自动填词搜索（注入式），支持自定义地址 | `stable` |
| 🎬 | [**IMDB Search**](./extensions/imdb-search/) | [imdb.com](https://www.imdb.com) | 中文关键词通过 TMDB API 自动翻译后搜索 IMDB | `stable` |
| 🧩 | [**盘搜～观影增强**](./extensions/enhance-pansou/) | [观影站](https://www.xn--wcv59z.com) | 在影片详情页拼接自建 PanSou 盘搜结果（云盘按类型入表 + 磁力入表），双地址可配置 | `stable` |
| 🔮 | [**PanSou Search**](./extensions/pansou-search/) | 自建 PanSou 盘搜 | 右键选中文字在盘搜中搜索（注入式填词），支持弹窗手动搜索与自定义地址 | `stable` |
| 🎞️ | [**JuYing Search**](./extensions/juying-search/) | [jying.top](https://www.jying.top) | 聚影站内影片 + 聚合网盘双入口搜索（注入式填词），支持弹窗手动搜索与自定义地址 | `stable` |
| 🀄 | [**DianYing Search**](./extensions/dianying-search/) | [dian115.com](https://m.dian115.com) | 癫影电影/剧集/动漫三分类搜索，直开搜索 URL，支持弹窗手动搜索与自定义主页 | `stable` |
| 🟣 | [**PanLian Search**](./extensions/panlian-search/) | [pinglian.lol](https://pinglian.lol) | 盘链网盘资源搜索，直开搜索 URL，支持弹窗手动搜索与自定义主页 | `stable` |
| 📁 | [**云盘助手**](./extensions/cloud-drive-helper/) | 115、光鸭 | 统一配置页；115 分客户端扫码登录，光鸭双方式连接；目录只读，123 待接入 | `preview` |

---

## 使用方式

### 基础用法（右键搜索扩展）

1. 在任意网页选中文字
2. 右键点击对应的搜索菜单项
3. 在新标签页查看搜索结果

### 手动输入搜索

XCili、IMDB 支持点击扩展图标手动输入关键词；HDHive、Mukaku、KuakeQ、Jiaofu（观影）、SubHD 支持在弹窗中配置搜索主页地址。

### IMDB 翻译功能

IMDB 扩展通过 [TMDB API](https://www.themoviedb.org/) 将中文关键词翻译为英文后再搜索 IMDB。华语电影会跳过翻译直接搜索。翻译失败时自动降级为中文搜索。

**配置步骤：**
1. 在 [TMDB 官网](https://www.themoviedb.org/settings/api) 注册并获取 API Key
2. 右键点击扩展图标 → 选项 → 填入 API Key → 保存
3. 也可在弹窗中点击「配置 API Key」跳转

> 未配置 API Key 时，扩展仍可正常使用，只是用中文直接搜索 IMDB。

### 可配置搜索主页

HDHive、不太灵、夸克圈、观影（Jiaofu Search）、SubHD、TTD、盘搜～观影增强、PanSou Search、JuYing Search、DianYing Search、PanLian Search 支持自定义地址。点击对应扩展图标，在弹窗中修改并保存即可。

TTD 搜索的是 NAS 上自建的 TgtoDrive 管理台"影视探索"页：搜索不走 URL 参数，扩展会定位（或新开）TTD 标签页，自动填入关键词并模拟回车，**需要浏览器已登录 TgtoDrive**。已打开 TTD 时直接在原页面搜索，不再重复开标签页。

PanSou Search 右键选中文字即可在自建盘搜（PanSou）中搜索：盘搜前端不读 URL 参数，扩展会定位（或新开）盘搜标签页，自动填入关键词并模拟回车；也支持点击扩展图标手动输入关键词搜索。

PanLian Search 右键选中文字即可在盘链（pinglian.lol）中搜索网盘影视资源：搜索 URL 直接带 `q` 参数跳转；也支持点击扩展图标手动输入关键词搜索。域名可在弹窗中修改。

DianYing Search 右键选中文字可在癫影（dian115.com）中搜索，提供电影/剧集/动漫三个入口（搜索 URL 直接带 `kind` 参数跳转）；也支持点击扩展图标手动输入关键词后选择类型搜索。域名可在弹窗中修改。

JuYing Search 右键选中文字可在聚影（jying.top）中搜索，提供两个入口：**搜网盘资源**（聚合搜索）和**搜站内影片**（站内搜索）。聚影前端不读 URL 参数，扩展会定位（或新开）聚影标签页并导航到 `/search`，自动切换对应搜索 tab、填入关键词并点击搜索；也支持点击扩展图标手动输入关键词后选择站内/聚合搜索。

盘搜～观影增强 在观影站（默认镜像 `www.xn--wcv59z.com`，品牌域名会变更）影片详情页标题旁注入盘搜按钮：点击后调用自建 [PanSou](https://github.com/fish2018/PanSou) 服务搜索影片主标题，云盘结果（仅夸克/光鸭/115/123 四类）按类型拼进"网盘资源"对应表格（缺的类型自动建表），磁力结果拼进"磁力资源"表（含复制按钮）；与原生结果按链接去重，再次点击强制刷新，标题旁铅笔按钮可修改搜索词。观影站与 PanSou 服务地址均可在弹窗/选项页配置。

---

## 安装

```bash
git clone https://github.com/zaynzhu/zaynzhu-browser-extensions.git
```

1. 打开 Chrome，地址栏输入 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择对应的扩展目录：

| 扩展 | 目录路径 |
|------|----------|
| HDHive | `extensions/hdhive-search/` |
| 豆瓣 | `extensions/douban-search/` |
| 123盘 | `extensions/123pan-search/` |
| 无极磁力 | `extensions/xcili-search/` |
| 不太灵 | `extensions/mukaku-search/` |
| 夸克圈 | `extensions/kuakeq-search/` |
| 观影 | `extensions/jiaofu-search/` |
| SubHD | `extensions/subhd-search/` |
| TTD | `extensions/tgtodrive-search/` |
| IMDB | `extensions/imdb-search/` |
| 盘搜～观影增强 | `extensions/enhance-pansou/` |
| PanSou Search | `extensions/pansou-search/` |
| JuYing Search | `extensions/juying-search/` |
| DianYing Search | `extensions/dianying-search/` |
| PanLian Search | `extensions/panlian-search/` |
| 云盘助手 | `extensions/cloud-drive-helper/` |

> 十六个扩展互相独立，可按需安装，也可以同时安装全部。

### 云盘助手：统一配置与目录选择（0.3.5）

1. 加载或重新加载 `extensions/cloud-drive-helper/`，点击扩展图标打开完整配置页。页面提供 115、光鸭、123 三个入口，当前支持 115 和光鸭，123 待接入。
2. 光鸭可选两种连接方式：**开发者凭证**保留原有 `client_id` / `client_secret` 输入（光鸭会员在「账号设置 → TOKEN 管理 → 成为开发者」获取）；**网页登录**先点击「打开光鸭官网登录」，自行在官网完成验证码或扫码登录，再回配置页点击「已登录，连接此账号」。已登录官网时可直接回配置页连接。
3. 点击文件夹进入子目录，点击路径返回上级；目录多于 50 个时可翻页。点击「使用此文件夹」保存目标，根目录也可选。两种连接方式的目标分别保存，重新连接不同账号时清除该方式的旧目标。
4. 网页登录令牌仅放在 `chrome.storage.session`，浏览器重启或令牌过期后，需要刷新官网并重新连接。断开网页登录只清除扩展连接及对应目标，不退出官网，也不删除开发者凭证。

开发者凭证与目标选择保存在 `chrome.storage.local`，不随账号同步、不是加密保险库，且限制为扩展可信页面访问。网页登录只在主动点击连接时，通过 `scripting` 读取本扩展打开的光鸭官网标签页中指定的登录项；不读取其他标签页，不保存密码、验证码或刷新令牌，无日志或遥测。光鸭连接使用 `storage`、`scripting` 及光鸭的 `www`、`api`、`dapi` 三个 HTTPS 主机。API 请求至少间隔 2 秒，失败不自动重试。本版尚未执行分享转存或离线下载。

接口依据：[光鸭开发者文档](https://wcn6ijfe07e0.feishu.cn/wiki/R6Z2weFwKiwnuBktcoacoDAHnZg)及[光鸭官网](https://www.guangyapan.com/)公开网页代码。2026-09-05 开发者凭证已完成根目录、子目录只读验证；网页登录已通过当前官网会话完成根目录只读请求（HTTP 200），并核对指定登录项结构。成功响应可能省略 `code`，客户端同时校验 `msg` 和数据结构。网页登录依赖官网存储格式，官网变更后可能需要适配；未验证从未登录状态输入验证码的完整过程，也未完成安装扩展后的端到端联调。

**115 手机扫码连接**

1. 在配置页选择「115」，选择要用于插件的客户端类型（共 17 种：115生活安卓 / iOS / iPad、115 安卓 / iOS / iPad、Linux、macOS、安卓电视、Apple TV、115管理安卓 / iOS / iPad、支付宝 / 微信小程序、鸿蒙或网页端），点击「生成二维码」。无需申请 AppID，也无需官网预先登录。
2. 用手机 115 App 扫码并确认；首次或同账号登录成功即保存会话，目录失败可点击「刷新」重试，不必反复扫码。同类型切换不同账号仍须读取根目录成功后才替换旧连接。二维码最多等待两分钟，支持取消和重新生成；普通网络错误停止轮询，状态长轮询超时则继续等待到总期限。
3. 仅分页列出根目录第一层文件夹，点击文件夹右侧「选择」即可保存目标，不进入子目录或读取文件内容。每种客户端类型独立保存会话和目标；同类型换账号成功后清除旧目标，扫码失败或切换不同账号时目录校验失败，保留原有连接。
4. 会话保存在本机 `chrome.storage.local` 的可信扩展上下文中，浏览器重启后仍保留。它不是加密保险库，不保证会话永久有效；同类型设备重新登录或服务端撤销会话后，需要重新扫码。「断开」只清除所选类型的会话及目标，不影响光鸭或其他客户端类型。扫码前请确认该账号所选类型未被其他正式环境占用；本地分开保存会话不能阻止服务端让同类型旧登录失效。

115 新增 `qrcodeapi.115.com`、`passportapi.115.com`、`webapi.115.com`、`proapi.115.com` 四个 HTTPS 主机权限及 `declarativeNetRequestWithHostAccess`：仅在本扩展发起 `/files` 或 `/{所选类型}/2.0/ufile/files` 目录请求期间附加所选扫码会话，并在结束时移除规则；不写入、导出或替换浏览器已有的 115 Cookie。二维码等待信息放在 `chrome.storage.session`；登录 Cookie 不返回配置页、不写入日志或测试。115 的请求单独限流，每次间隔至少 2 秒。

扫码调用顺序及客户端类型核对了[115 官网登录代码](https://cdnassets.115.com/login/login-api.js)和用户提供的[115不大助手](https://greasyfork.org/zh-CN/scripts/474231)。补充客户端标识参考了 [p115client 的客户端映射](https://github.com/ChenyangGao/p115client/blob/main/p115client/const.py)（Apple TV 为 `apple_tv`，Linux / macOS 为 `os_linux` / `os_mac`）。扩展自行实现最小扫码链路，不安装或运行该用户脚本。当前使用网站客户端接口，并非需审核 AppID 的开放平台 OAuth；服务端变更后可能需要适配。2026-09-06 已验证真实安卓类型 token 与二维码图片获取，并验证未扫码时长轮询超时仍保持等待；合成测试覆盖完整交换、会话持久恢复、账号与类型隔离、取消和失败处理。用户提供的响应已确认鸿蒙扫码交换成功（会话类型 S1），网页目录接口曾返回 `errNo: 230012`。现仅在该错误时，沿用相同会话尝试[对应客户端的普通目录接口](https://github.com/ChenyangGao/p115client/blob/main/p115client/client.py)，不重新登录或切换类型；应用目录按 `fc / fid / fn / pid` 校验文件夹及父目录。合成测试及 Chrome 合成页面验证覆盖失败后刷新与直接保存第一层目标；独立临时 Chrome 实测确认受限规则能在 `credentials: omit` 请求中附加合成 Cookie。**真实根目录读取仍待有效会话验收**：授权只读排查时，此前鸿蒙会话已被各接口判定失效，未再次登录或读取子目录。其他客户端类型的实际可用性也需逐个扫码验证。分享转存和磁力离线尚未实现。

后续升级：115 暂停在根目录第一层文件夹读取与目标保存。分享转存、磁力离线及各自的结果确认留待后续单独接入；不预先增加安全密钥流程，只有具体接口实测明确要求时再处理。下一阶段优先接入 123 云盘的登录、第一层文件夹与目标保存。

合成测试与界面预览（不访问真实账号）：

```bash
fnm exec --using=22.22.2 node --test extensions/cloud-drive-helper/tests/*.test.js
fnm exec --using=22.22.2 node extensions/cloud-drive-helper/tests/preview-server.js
```

---

## 权限说明

| 扩展 | `contextMenus` | `storage` | `activeTab` | 说明 |
|------|:--------------:|:---------:|:-----------:|------|
| HDHive | ✅ | ✅ | - | 弹窗 + 域名配置存储 |
| 豆瓣 | ✅ | - | - | 纯右键跳转 |
| 123盘 | ✅ | - | - | 纯右键跳转 |
| XCili | ✅ | ✅ | ✅ | 弹窗搜索 + 结果展示 |
| Mukaku | ✅ | ✅ | - | 弹窗 + 域名配置存储 |
| KuakeQ | ✅ | ✅ | - | 弹窗 + 域名配置存储 |
| 观影 | ✅ | ✅ | - | 弹窗 + 域名配置存储 |
| SubHD | ✅ | ✅ | - | 弹窗 + 域名配置存储 |
| TTD | ✅ | ✅ | - | 弹窗 + 地址配置存储 + 注入填词（`scripting`，host `<all_urls>`） |
| IMDB | ✅ | ✅ | - | 弹窗 + API Key 配置存储 |
| 盘搜～观影增强 | - | ✅ | - | 详情页注入（`scripting` + content script，host `<all_urls>`）+ 双地址配置存储 |
| PanSou Search | ✅ | ✅ | - | 弹窗 + 地址配置存储 + 注入填词（`scripting`，host `<all_urls>`） |
| JuYing Search | ✅ | ✅ | - | 弹窗 + 地址配置存储 + 注入填词（`scripting`，host `<all_urls>`） |
| DianYing Search | ✅ | ✅ | - | 弹窗 + 地址配置存储（搜索 URL 直开，无注入） |
| PanLian Search | ✅ | ✅ | - | 弹窗 + 地址配置存储（搜索 URL 直开，无注入） |
| 云盘助手 | - | ✅ | - | 凭证及目标仅本机保存，仅访问光鸭官方 `dapi.guangyapan.com` |

所有扩展均不采集任何用户数据。

---

## 目录结构

```
zaynzhu-browser-extensions/
├── README.md
├── CLAUDE.md
├── .gitignore
└── extensions/
    ├── hdhive-search/           # 聚合搜索 — 弹窗 + 域名配置
    │   ├── manifest.json
    │   ├── background.js
    │   ├── search-url.js
    │   ├── popup.html / js / css
    │   └── icons/
    ├── douban-search/           # 豆瓣搜索 — manifest + background.js
    │   ├── manifest.json
    │   ├── background.js
    │   └── icon.png
    ├── 123pan-search/           # 123盘搜索 — manifest + background.js
    │   ├── manifest.json
    │   ├── background.js
    │   └── icons/
    ├── xcili-search/            # 磁力搜索 — 弹窗 + 结果展示
    │   ├── manifest.json
    │   ├── background.js
    │   ├── popup.html / js / css
    │   └── icons/
    ├── mukaku-search/           # 不太灵 — 弹窗 + 域名配置
    │   ├── manifest.json
    │   ├── background.js
    │   ├── search-url.js
    │   ├── popup.html / js / css
    │   └── icons/
    ├── kuakeq-search/            # 夸克圈 — 弹窗 + 域名配置
    │   ├── manifest.json
    │   ├── background.js
    │   ├── popup.html / js / css
    │   └── icons/
    ├── jiaofu-search/            # 观影 — 弹窗 + 域名配置
    │   ├── manifest.json
    │   ├── background.js
    │   ├── search-url.js
    │   ├── popup.html / js / css
    │   └── icons/
    ├── subhd-search/             # SubHD 字幕 — 弹窗 + 域名配置
    │   ├── manifest.json
    │   ├── background.js
    │   ├── search-url.js
    │   ├── popup.html / js / css
    │   └── icons/
    ├── tgtodrive-search/          # TTD（NAS 自建 TgtoDrive）— 弹窗 + 地址配置 + 注入式搜索
    │   ├── manifest.json
    │   ├── background.js
    │   ├── search-url.js
    │   ├── popup.html / js / css
    │   └── icons/
    ├── imdb-search/             # IMDB — 弹窗 + API Key 配置
    │   ├── manifest.json
    │   ├── background.js
    │   ├── popup.html / js / css
    │   ├── options.html / js / css
    │   └── icons/
    ├── enhance-pansou/          # 盘搜～观影增强 — 详情页注入 + 双地址配置
    │   ├── manifest.json
    │   ├── background.js        # PanSou API 客户端 + 缓存 + 频率限制
    │   ├── shared.js            # 地址归一化 + 标题提取（popup/options/content 共用）
    │   ├── content.js / css     # 详情页图标 + 表格拼接
    │   ├── popup.html / js / css
    │   ├── options.html / js / css
    │   └── icons/
    ├── pansou-search/           # PanSou 盘搜 — 右键/弹窗注入式搜索 + 地址配置
    │   ├── manifest.json
    │   ├── background.js
    │   ├── search-url.js
    │   ├── popup.html / js / css
    │   └── icons/
    ├── juying-search/           # JuYing 聚影 — 站内/聚合双入口注入式搜索 + 地址配置
    │   ├── manifest.json
    │   ├── background.js
    │   ├── search-url.js
    │   ├── popup.html / js / css
    │   └── icons/
    ├── dianying-search/         # DianYing 癫影 — 电影/剧集/动漫三分类直开搜索 + 地址配置
    │   ├── manifest.json
    │   ├── background.js
    │   ├── search-url.js
    │   ├── popup.html / js / css
    │   └── icons/
    ├── panlian-search/         # PanLian 盘链 — 直开搜索 URL + 地址配置
    │   ├── manifest.json
    │   ├── background.js
    │   ├── search-url.js
    │   ├── popup.html / js / css
    │   └── icons/
    └── cloud-drive-helper/     # 云盘助手 — 光鸭只读目录选择
        ├── manifest.json
        ├── background.js
        ├── guangya-api.js
        ├── popup.html / js / css
        └── tests/              # 合成测试与界面预览
```

---

## 搜索 URL 格式

| 扩展 | URL 模板 |
|------|----------|
| HDHive | `hdhive.com/search?query={keyword}&type=multi&page=1`（域名可配置） |
| 豆瓣 | `search.douban.com/movie/subject_search?search_text={keyword}` |
| 123盘 | `us.pan1.me/?search-{encoded}-1.htm`（`encodeURIComponent` 后 `%` → `_`） |
| XCili | `xcili.com/search?q={keyword}` |
| 不太灵 | `web2.mukaku.com/search?sb={keyword}`（域名可配置） |
| KuakeQ | `kuakeq.com/search-{encoded}-1-1.htm`（`encodeURIComponent` 后 `%` → `_`，域名可配置） |
| 观影 | `www.xn--wcv59z.com/search?q={keyword}&type=&mode=1`（域名可配置） |
| SubHD | `subhd.tv/search/{keyword}`（域名可配置） |
| TTD | 不走 URL 参数：打开配置地址 → 注入脚本填入 `#md-library-query` 并模拟 Enter（地址可配置，需已登录） |
| IMDB | `imdb.com/find/?q={keyword}`（中文通过 TMDB 翻译后搜索） |
| 盘搜～观影增强 | 不跳转：详情页注入 `GET {pansou}/api/search?kw={主标题}&res=merge`，结果拼进当前页资源表格（双地址可配置） |
| PanSou Search | 不走 URL 参数（前端不读 query）：打开配置地址后注入脚本，向 `input[placeholder^="搜索资源"]` 填词并模拟 Enter；复用已打开的盘搜标签页（地址可配置，存储在 `chrome.storage`） |
| JuYing Search | 不走 URL 参数（站内/聚合均为纯前端状态）：打开配置地址的 `/search` 后注入脚本，点击对应 `.n-tabs-tab` → 向可见的 `input.n-input__input-el` 填词 → 点击"搜索"按钮；复用已打开的聚影标签页（地址可配置，默认 `https://www.jying.top`） |
| DianYing Search | `m.dian115.com/discover?kind={movie|tv|anime}&q={keyword}`（三分类菜单，直开 URL 即出结果，域名可配置） |
| PanLian Search | `pinglian.lol/pages/search.php?q={keyword}`（域名可配置） |

---

## 技术细节

- **Manifest V3** — Service Worker 后台运行
- **极简权限** — 仅申请必要权限，不采集任何用户数据
- **零依赖** — 纯原生 JavaScript，无第三方库
- **新标签打开** — 搜索结果在独立标签页展示，不干扰当前浏览

---

## 添加新扩展

```bash
# 1. 新建目录（小写连字符命名）
mkdir extensions/my-new-search

# 2. 创建 manifest.json 和 background.js
# 3. 参照现有扩展的结构实现
# 4. 在本文件的扩展索引中补充一行记录
```

---

<div align="center">
<sub>持续更新中 · 欢迎 Fork 构建你自己的搜索扩展库</sub>
</div>
