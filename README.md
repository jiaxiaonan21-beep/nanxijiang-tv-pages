# 南溪江TV · GitHub Pages 测试版

无需 Node.js 构建、服务器或 PASSWORD 环境变量的独立静态播放器。版本 1.0.0。

## 上传和发布

1. 在 GitHub 新建一个 **Public（公开）** 仓库，建议名称 `nanxijiang-tv-pages`。保留原来 `nanxijiang-tv` 私有仓库。
2. 解压上传包，进入里面的文件夹。点击 GitHub 的 **uploading an existing file**（已有文件时为 **Add file → Upload files**），把文件夹里面的全部文件和子文件夹拖进去，提交。
3. 仓库首页应直接看见 `index.html`、`app.js`、`style.css`、`vendor`、`icons`，不能再套一层文件夹。`.nojekyll` 一并上传；本项目不依赖它才能运行。
4. 打开仓库 **Settings → Pages**。Source 选择 **Deploy from a branch**；Branch 选择 **main**，目录选择 **/(root)**，点击 **Save**。
5. 等待 Pages 发布完成。GitHub 会在这个页面显示访问网址，通常需要数分钟。

若使用账号 `jiaxiaonan21-beep` 和上面的仓库名，预期网址为：
`https://jiaxiaonan21-beep.github.io/nanxijiang-tv-pages/`
这是预计地址，本地打包不会自动创建或发布该站点。

GitHub Free 的 Pages 使用公开仓库。代码和内置片源地址会公开；不要上传密码、令牌、私人片源配置或导出的播放记录。浏览器内的记录不会随源码上传。

## 使用

- 在“设置”检查、启用或添加片源，再到首页搜索。支持返回 `list` 数组的 CMS JSON 接口，以及 `vod_play_url` 中的 HTTPS 播放地址。
- 多个片源同时搜索，谁先返回就先显示；超时 8 秒。各源的集数、分页数据由片源提供。
- 支持选集、上一集/下一集、倍速、全屏、直链视频、浏览器支持格式的本地视频。
- 网络视频的集数和观看进度保存在本机，历史里可以继续播放、删除选中或删除未选中。
- “导出本机备份”保存片源和记录；“导入 JSON”可以导入本版本备份，或下面的片源配置。

```json
{"sources":[{"name":"我的片源","url":"https://example.com/api.php/provide/vod/","enabled":true}]}
```

本地视频每次需要重新选择，不保存本地文件权限或位置。本版不删除原文件、不下载影片、不含服务器代理、账号登录或云端同步。直播订阅和嵌入网站功能未迁入此精简版。

## iPhone / iPad

用 Safari 打开已发布网址，点击“分享 → 添加到主屏幕”。推荐更新系统和 Safari。
播放器优先使用 iOS 原生全屏，其他浏览器尝试标准全屏，最后回退到页面内铺满显示。最后一种仍可能显示浏览器界面。

## 更新

将新版本文件上传覆盖到同一仓库，等待 Pages 发布。重新打开页面；出现“更新并重新载入”时点击更新。
主屏幕图标通常不需要重新安装。设备清理网站数据、无痕模式或更换网址可能导致本机记录消失，建议定期备份。

## 静态版本的限制

GitHub Pages 只提供 HTML、CSS 和 JavaScript，不运行原版的服务端接口。片源接口和视频都从设备直接访问。

- 片源接口必须允许浏览器跨域读取。返回搜索结果也不保证视频地址没有跨域、防盗链或编码限制。
- 只接受 HTTPS 片源和网络播放地址，避免 HTTPS 网页中的混合内容阻止。
- “无法读取片源”可能由跨域、DNS、证书或网络故障引起，浏览器不能总是给出确切原因。
- GitHub Pages 及第三方片源在国内的可访问性和速度无法保证。本版减少服务端中转，不保证比所有其他部署都快。
- 离线缓存仅保存网页和播放器代码，**不保存影片供离线观看**。
- 片源列表属于兼容性候选，并非稳定播放承诺。实际测试见 TEST_REPORT.md。

## 开发验证与许可

本机使用任意静态 HTTP 服务访问，不能直接双击 `index.html`，因为 ES module 和 Service Worker 需要网页环境。
安装 Node.js 后可运行 `npm test`，无需安装依赖。

本项目采用 AGPL-3.0-or-later，见 LICENSE。保留相关来源和许可；公开使用修改版时应按许可提供对应源码。
播放器依赖 hls.js，发行包内保留其 Apache-2.0 许可 `vendor/HLS-LICENSE.txt`。

GitHub Pages 官方说明：
https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
