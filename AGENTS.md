# zaynzhu-browser-extensions 开发规范

## 项目概述

轻量级 Chrome 浏览器右键搜索扩展合集，选中文字即可跳转影视网站搜索。

## 目录结构

```
zaynzhu-browser-extensions/
├── extensions/                # 所有扩展的汇总目录
│   ├── hdhive-search/         # HDHive 搜索扩展（右键搜索，支持自定义搜索主页）
│   │   ├── manifest.json
│   │   ├── background.js
│   │   ├── search-url.js
│   │   ├── popup.html/js/css
│   │   └── icons/             # icon16/48/128.png
│   ├── douban-search/          # 豆瓣搜索扩展
│   │   ├── manifest.json
│   │   ├── background.js
│   │   └── icon.png
│   ├── 123pan-search/          # 123盘搜索扩展
│   │   ├── manifest.json
│   │   ├── background.js
│   │   └── icons/              # icon16/48/128.png
│   ├── xcili-search/           # 无极磁力搜索扩展（右键/手动输入关键词搜磁力）
│   │   ├── manifest.json
│   │   ├── background.js
│   │   ├── popup.html/js/css
│   │   └── icons/
│   ├── mukaku-search/           # 不太灵搜索扩展（右键搜索，支持自定义搜索主页）
│   │   ├── manifest.json
│   │   ├── background.js
│   │   ├── search-url.js
│   │   ├── popup.html/js/css
│   │   └── icons/
│   ├── kuakeq-search/            # 夸克圈搜索扩展（右键搜索磁力链接，支持自定义搜索主页）
│   │   ├── manifest.json
│   │   ├── background.js
│   │   ├── popup.html/js/css
│   │   └── icons/
│   ├── jiaofu-search/            # 观影搜索扩展（右键搜索影视资源，支持自定义搜索主页）
│   │   ├── manifest.json
│   │   ├── background.js
│   │   ├── search-url.js
│   │   ├── popup.html/js/css
│   │   └── icons/
│   ├── subhd-search/             # SubHD 字幕搜索扩展（右键搜索字幕，支持自定义搜索主页）
│   │   ├── manifest.json
│   │   ├── background.js
│   │   ├── search-url.js
│   │   ├── popup.html/js/css
│   │   └── icons/
│   ├── tgtodrive-search/         # TTD 搜索扩展（右键搜索 NAS 上 TgtoDrive 影视探索，注入式，支持自定义地址）
│   │   ├── manifest.json
│   │   ├── background.js
│   │   ├── search-url.js
│   │   ├── popup.html/js/css
│   │   └── icons/
│   ├── imdb-search/             # IMDB 搜索扩展（右键搜索，通过 TMDB API 翻译中文）
│       ├── manifest.json
│       ├── background.js
│       ├── popup.html/js/css
│       ├── options.html/js/css
│       └── icons/
│   ├── enhance-pansou/          # 盘搜～观影增强扩展（影片详情页拼接 PanSou 盘搜结果，双地址可配置）
│       ├── manifest.json
│       ├── background.js        # PanSou API 客户端 + 缓存 + 频率限制
│       ├── shared.js            # 地址归一化 + 标题提取（popup/options/content 共用）
│       ├── content.js/css       # 详情页图标 + 表格拼接
│       ├── popup.html/js/css
│       ├── options.html/js/css
│       └── icons/
│   ├── pansou-search/           # PanSou 盘搜扩展（右键/弹窗注入式搜索盘搜，支持自定义地址）
│       ├── manifest.json
│       ├── background.js
│       ├── search-url.js
│       ├── popup.html/js/css
│       └── icons/
│   ├── juying-search/           # JuYing 聚影搜索扩展（右键/弹窗注入式，站内影片 + 聚合网盘双入口，支持自定义地址）
│       ├── manifest.json
│       ├── background.js
│       ├── search-url.js
│       ├── popup.html/js/css
│       └── icons/
│   ├── dianying-search/         # DianYing 癫影搜索扩展（右键/弹窗直开搜索 URL，电影/剧集/动漫三分类，支持自定义搜索主页）
│       ├── manifest.json
│       ├── background.js
│       ├── search-url.js
│       ├── popup.html/js/css
│       └── icons/
│   ├── panlian-search/         # PanLian 盘链搜索扩展（右键/弹窗直开搜索 URL，支持自定义搜索主页）
│       ├── manifest.json
│       ├── background.js
│       ├── search-url.js
│       ├── popup.html/js/css
│       └── icons/
│   └── cloud-drive-helper/     # 云盘助手（三云盘配置入口，115 分客户端扫码、光鸭双连接与只读目录选择）
│       ├── manifest.json
│       ├── background.js
│       ├── guangya-api.js       # 开发者签名 / 网页 Bearer、目录列表、跨后台休眠限流
│       ├── web-session.js       # 按需读取指定光鸭官网登录项
│       ├── pan115-api.js        # 分客户端二维码 / 会话交换 / 只读目录接口
│       ├── pan115-background.js # 持久会话、类型和账号隔离、受限请求头规则
│       ├── pan123-api.js        # 账号密码登录、签名、只读根目录分页
│       ├── pan123-background.js # 本机令牌、账号隔离与目标保存
│       ├── share-link.js        # 官方分享地址与提取码解析
│       ├── share-transfer.js    # 三云盘转存、任务状态与目录回读核验
│       ├── transfer-background.js # 账号目标绑定、临时会话规则和结果状态
│       ├── transfer.html/js     # 独立转存结果页
│       ├── popup.html/js/css
│       └── tests/               # 合成测试与界面预览
├── AGENTS.md
├── README.md
└── .gitignore
```

## 技术栈

- Chrome Manifest V3
- Service Worker（后台运行）
- 简单搜索扩展仅申请 `contextMenus` 权限；hdhive-search 额外申请 `storage`；xcili-search 额外申请 `activeTab` 和 `storage`；mukaku-search 额外申请 `storage`；kuakeq-search 额外申请 `storage`；jiaofu-search 额外申请 `storage`；subhd-search 额外申请 `storage`；imdb-search 申请 `storage`；tgtodrive-search 额外申请 `storage` 和 `scripting`（注入填词脚本），host 权限 `<all_urls>`（目标为自建 NAS，地址可配置无法预先限定）；enhance-pansou 申请 `storage` 和 `scripting`（content script 注入详情页），host 权限 `<all_urls>`（观影站与盘搜地址均可配置）；pansou-search 额外申请 `storage` 和 `scripting`（注入填词脚本），host 权限 `<all_urls>`（盘搜地址可配置）；juying-search 额外申请 `storage` 和 `scripting`（注入填词脚本），host 权限 `<all_urls>`（聚影地址可配置）；dianying-search 仅申请 `contextMenus` 和 `storage`（直开搜索 URL，无注入）；panlian-search 仅申请 `contextMenus` 和 `storage`（直开搜索 URL，无注入）
- 零依赖，纯原生 JS
- cloud-drive-helper 申请 `contextMenus`、`storage`、`scripting` 及 `https://dapi.guangyapan.com/*`、`https://api.guangyapan.com/*`、`https://www.guangyapan.com/*`。点击图标通过 `openOptionsPage` 打开 `popup.html` 完整配置页。光鸭支持开发者凭证（本机 `chrome.storage.local`，TRUSTED_CONTEXTS）与网页登录（仅用户点击时读取本扩展打开的官网标签页指定登录项，访问令牌存 `chrome.storage.session`，不读取刷新令牌）。两种方式的目标分开保存，网页目标绑定账号，切换账号清除旧目标。开发者方式仅读取普通目录并保存目标；分享转存使用网页登录及其独立目标，磁力离线尚未实现。实际成功响应可能省略 `code`，需校验 `msg` 与目录结构；限流时间保存在 `chrome.storage.session`，请求间隔至少 2 秒。

- 115 主方案是在插件内选择客户端类型后手机扫码，不依赖官网已登录或 AppID。追加 `qrcodeapi.115.com`、`passportapi.115.com`、`webapi.115.com`、`proapi.115.com` 主机及 `declarativeNetRequestWithHostAccess` 权限；扫码 Cookie 按客户端类型保存在本机 `chrome.storage.local`，目标绑定类型和账号，换账号失败保留旧状态。仅目录请求期间通过受限规则附加 Cookie（仅本扩展发起的 `/files?` 或对应客户端 `/2.0/ufile/files?` 请求），结束时移除规则，不改浏览器 Cookie。目录 ID 保持字符串；115 独立限流至少 2 秒，扫码有效期两分钟，状态长轮询超时继续等待但不突破总期限。不同配置页的旧连接 ID 不得覆盖新账号目标。所有测试与日志只用合成数据。首次或同账号扫码成功即保存会话以便目录失败后刷新，切换不同账号仍等目录成功后替换旧状态。网页目录返回 230012 时仅尝试一次所选客户端的应用目录接口，沿用同一 Cookie；仅列根目录第一层文件夹。鸿蒙扫码交换及 S1 类型已据用户响应核对，2026-09-07 已使用当前会话完成真实目录读取及分享转存验收；客户端分享列表使用 fid/fc/fn/fs。

- 123 使用手机号或邮箱加密码登录，固定 `https://api.123278.com/b/api/` 网站接口；仅本机保存令牌（TRUSTED_CONTEXTS），不保存密码、不自动重登。独立限流至少 2 秒，只读取根目录分页元数据并显示文件夹。目标绑定账号，旧连接 ID 不能修改新目标；切换账号目录失败保留旧状态。暂不支持验证码、离线；右键分享转存已接入。合成测试已覆盖，2026-09-07 已用用户建立的会话完成真实目录与分享转存验收。

- 配置页通过 `directory-cache.js` 缓存根目录到本机，按提供方、授权方式与 115 客户端隔离；连接 ID 变化、退出或本机会话过期时失效。打开页面只读连接状态和缓存，无缓存才取目录；手动刷新与测试连接强制读取，仍遵守限流。明确认证失败标记未连接，网络故障不清除会话。

- 分享转存通过 `contextMenus` 接收用户右键的链接或选中文字，不自动点击网页按钮、不执行任意 URL。固定 API 主机；115 临时规则 116 仅匹配本扩展发起的当前接口，结束移除。写入前核实账号、目标 ID 与名称，禁止默认根目录、覆盖和自动写入重试。任务完成及目标回读核验后才能显示成功；提交后不确定结果单独标记。真实测试数据不得进入源码、日志或 fixtures。

## 开发约定

- 每个扩展独立，互不依赖，可单独安装和发布
- 新增搜索扩展时在 `extensions/` 下创建独立子目录，结构参照现有扩展
- `background.js` 统一使用 `const` 声明常量，模板字符串拼接 URL
- 搜索 URL 中的查询参数必须 `encodeURIComponent` 编码
- 图标推荐提供 16/48/128 三种尺寸（多尺寸放 `icons/` 目录，单文件也可）

## 搜索 URL 格式

| 扩展 | URL 模板 |
|------|----------|
| HDHive | `https://hdhive.com/search?query={keyword}&type=multi&page=1`（域名可配置） |
| 豆瓣 | `https://search.douban.com/movie/subject_search?search_text={keyword}` |
| 123盘 | `https://us.pan1.me/?search-{encoded}-1.htm`（编码规则：`encodeURIComponent` 后 `%` → `_`） |
| XCili | `https://xcili.com/search?q={keyword}` |
| 不太灵 | `https://web2.mukaku.com/search?sb={keyword}`（域名可配置，存储在 `chrome.storage`） |
| KuakeQ | `https://www.kuakeq.com/search-{encoded}-1-1.htm`（编码规则：`encodeURIComponent` 后 `%` → `_`，域名可配置） |
| 观影 | `https://www.xn--wcv59z.com/search?q={keyword}&type=&mode=1`（域名可配置） |
| SubHD | `https://subhd.tv/search/{keyword}`（域名可配置） |
| IMDB | `https://www.imdb.com/find/?q={keyword}`（中文通过 TMDB API 翻译后搜索） |
| TTD | 不走 URL 参数（搜索为纯前端状态）：打开配置地址后注入脚本，先点击 `.nav-item[data-target="media-library-section"]` 切到影视探索区块（单页多 section，URL 不变），再向 `#md-library-query` 填词并模拟 Enter；复用已打开的 TTD 标签页（地址可配置，存储在 `chrome.storage`，需浏览器已登录 TgtoDrive） |
| 盘搜～观影增强 | 不跳转：影片详情页（如 `/tv/7yjx`）标题旁注入盘搜按钮，点击后 background 调 `GET {pansou}/api/search?kw={主标题}&res=merge`；仅取夸克/光鸭/115/123 四类云盘（`merged_by_type`）按类型拼进"网盘资源"对应 `bit_list` 表（类型名在各表的 `<caption>`，缺表则新建）+ 磁力/ed2k 拼进"磁力资源"表（名称列 `盘搜～{note}` + 复制按钮）；按链接 URL 与原生行去重，注入行标记 `data-pansou`；再次点击图标强制刷新（`refresh=1`），铅笔按钮可改词重搜；主标题从 h1 提取（去季/部标记与年份）；观影站与盘搜地址均可配置（存储在 `chrome.storage`） |
| PanSou Search | 不走 URL 参数（前端不读 query，搜索为纯前端状态）：打开配置地址后注入脚本，向 `input[placeholder^="搜索资源"]` 填词（native setter + input 事件）并模拟 Enter；复用已打开的盘搜标签页（地址可配置，存储在 `chrome.storage`，裸主机名默认补 `http://`）；popup 支持手动输入关键词搜索，复用同一条注入链路 |
| JuYing | 不走 URL 参数（站内/聚合搜索均为纯前端状态）：打开配置地址的 `/search` 后注入脚本，点击对应 `.n-tabs-tab`（站内搜索/聚合搜索）→ 向可见的 `input.n-input__input-el` 填词（native setter + input 事件）→ 点击 main 内文本为"搜索"的按钮；复用已打开的聚影标签页（地址可配置，存储在 `chrome.storage`，默认 `https://www.jying.top`）；popup 支持手动输入关键词，站内/聚合两个入口复用同一条注入链路 |
| DianYing | `https://m.dian115.com/discover?kind={movie|tv|anime}&q={keyword}`（三分类菜单，不带 kind 时站点默认电影，域名可配置） |
| 盘链 | `https://pinglian.lol/pages/search.php?q={keyword}`（域名可配置） |

## 发布流程

云盘助手的合成测试：`fnm exec --using=22.22.2 node --test extensions/cloud-drive-helper/tests/*.test.js`。测试与预览只使用合成数据，不写入真实凭证或目录内容。

1. 修改代码
2. `chrome://extensions` 刷新扩展并测试
3. 升级 `manifest.json` 中的 `version`
4. 提交并推送到 GitHub
