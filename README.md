# 四级词库·错词抄写本（离线版 / PWA）

这个文件夹里的 5 个文件要放在同一个目录下一起用，不要改文件名（`manifest.json` 和 `service-worker.js` 里用的都是相对路径）：

```
index.html          主程序
manifest.json        App 的名称、图标、启动方式配置
service-worker.js    离线缓存逻辑
icon-192.png          App 图标（小尺寸）
icon-512.png          App 图标（大尺寸）
```

和之前 Claude 里那版最大的区别：数据存储从 Claude 的 `window.storage`
换成了浏览器自带的 `localStorage`，所以脱离 Claude、脱离网络都能正常读写数据。

## 先在自己电脑上快速测试一下

Service Worker（离线缓存）必须通过 `http://` 或 `https://` 访问才会生效，
双击直接打开 `index.html`（`file://` 方式）是不行的，需要起一个本地小型服务器：

**如果电脑上有 Python（Windows/Mac 一般都有）：**

```bash
cd 这个文件夹的路径
python3 -m http.server 8000
```

然后浏览器打开 `http://localhost:8000`，能正常使用就说明没问题。
第一次打开时按 F12 打开开发者工具，看 Console 里有没有报错，
Application 面板里能看到 Service Worker 已经注册、Manifest 信息也能看到，就说明配置是对的。

## 部署到网上（这样才能真正"安装"成 App）

最简单免费的办法是 **GitHub Pages**：

1. 注册一个 GitHub 账号（如果还没有）
2. 新建一个仓库（Repository），比如叫 `vocab-app`
3. 把这 5 个文件全部上传到这个仓库（网页端直接拖拽上传就行，不需要会用 git 命令）
4. 进仓库的 Settings → Pages，Source 选 `main` 分支、根目录 `/`，保存
5. 等一两分钟，会生成一个类似 `https://你的用户名.github.io/vocab-app/` 的网址
6. 用这个网址访问，就是一个真正可以离线使用、可以安装的网页 App 了

（Netlify、Vercel 也是类似的免费选项，操作方式大同小异，GitHub Pages 对纯静态文件是最省事的。）

## 怎么"安装"成一个独立的 App

- **Windows（Chrome / Edge）**：打开网址后，地址栏右侧会出现一个"安装"图标（一个带➕的小电脑图标），点一下即可，安装后会在开始菜单和桌面出现独立图标，双击打开是独立窗口，不会显示浏览器地址栏。
- **Android（Chrome）**：打开网址，浏览器菜单里点"安装应用"或"添加到主屏幕"，效果和普通 App 一样，图标在桌面上，离线也能打开。
- **iPhone（Safari）**：打开网址，点分享按钮 → "添加到主屏幕"。iOS 对 PWA 的支持比安卓弱一些，个别效果可能有差异，但基本功能和离线存储都没问题。

## 关于数据

- 数据存在**浏览器本地**（localStorage），换设备、换浏览器、卸载重装都不会同步，是各存各的。
- 如果清除浏览器缓存/网站数据，这份记录会被删掉，请注意别手抖清了。
- 目前没有做"导出备份"功能，如果你需要这个（比如换手机时把记录搬过去），告诉我，我可以加一个"导出/导入学习记录"的功能。

## 以后要更新内容怎么办

以后如果想让我改功能、换样式，把改好的 `index.html` 重新上传替换掉仓库里的旧文件即可，
`service-worker.js` 里的 `CACHE_NAME` 建议改个版本号（比如 v1 → v2），
这样用户下次打开时才会主动去更新缓存，而不是一直用旧版本。
