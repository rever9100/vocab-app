# 项目背景：错词抄写本（背单词 PWA）

给 Claude Code 的项目说明。这个项目最初是在 claude.ai 对话里一步步做出来的，这里记录了当时的设计决定和踩过的坑。

## 用户

- 刚上大学，用这个项目练手，同时自己背四级单词用
- 用中文交流
- 用户有时会说"先解释/给方案，先别改"——这种时候只分析、不动代码，等确认后再改
- 非专业开发者，操作步骤要讲具体

## 项目是什么

纯静态网页背单词应用（HTML + CSS + 原生 JS，无框架、无后端），做成 PWA，可离线、可安装。
线上地址：https://rever9100.github.io/vocab-app/
部署：GitHub Pages，仓库 rever9100/vocab-app，main 分支根目录。
本地工作目录 `E:\code\vocab-pwa` 已用 git 关联该仓库，改完由 Claude Code 提交并推送（推送前先征得用户同意），不再网页上传文件。

## 文件

- `index.html` —— 全部界面和逻辑（一个大 IIFE）
- `wordbooks-data.js` —— 内置词书数据，挂在 `window.BUILTIN_WORDBOOKS`
  - 两本都是 `[en, zh, exampleEn, exampleCn]` 格式，全部带例句
  - cet4：4441 词（3618 个例句来自数据源，823 个手写）
  - cet6：2084 词（2018 个例句来自 kajweb/dict 的 CET6_2/CET6_1/CET6_3，66 个手写；2026-09 补齐）
  - 例句数据源：https://github.com/kajweb/dict 的 `book/*.zip`，解压后是 JSON-lines，例句在 `content.word.content.sentence.sentences[0]` 的 `sContent` / `sCn`
- `service-worker.js` —— 离线缓存（cache-first）
- `manifest.json`、`icon-192.png`、`icon-512.png` —— PWA 安装配置和图标
- `README.md` —— 面向用户/访客的软件介绍（不要写成部署操作说明）

## 关键设计

**存储**：localStorage，key 为 `vocab-app-state-v1`，通过 `localStore` 这个异步 shim 访问。早期版本在 claude.ai artifact 里用的是 `window.storage`，已替换。

**状态模型**：`state.words` 是所有已加载的词，每个词带 `book` 字段（`cet4` / `cet6` / `custom`），id 为 `book + ':' + 小写单词`。`state.activeBook` 是当前在背的词书，内置词书在首次选中时才通过 `ensureBookLoaded()` 懒加载进 `state.words`。用户导入的词进入 `custom` 词书（"我的词库"）。`migrateState()` 负责把旧版本存档升级到新结构，改数据结构时必须同步更新它，保证用户已有进度不丢。

**词书内容同步**：已加载的词会把释义、例句复制一份存进 localStorage，所以光改 `wordbooks-data.js` 老用户看不到。`syncBuiltinBooks()`（在 `migrateState()` 里调用）每次打开时用最新词书刷新已加载词书的 en/zh/例句，保留学习进度；词书里新增的词补进去，删掉的词移除。改了某个内置词的拼写（即改了 id），要在 `RENAMED_WORDS` 里登记"旧小写拼写 → 新拼写"，否则那个词的进度会丢。2026-09 修过一批原始数据里的坏词（如 `refereen`→`referee`、`inser`→`insert`，还有一条把 fringe 和 scout 交错混在一起的），都登记在里面。

**复习（简化艾宾浩斯）**：`REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30]` 天。答对进下一阶段，答错打回第 0 阶段。走完全部阶段算"已掌握"。每日新词额度 `dailyNewGoal`（默认 30）是全局共享的，不按词书分开算。今日任务做完后的"加练"（`ui.bonusMode`）答对**不推进**复习阶段（否则一晚上能把词刷成已掌握），答错照常打回第 0 阶段。

**连续天数**：按"答了题的天"算，`updateStreak()` 在 `grade()` 里调用（以前在 `init()` 里，只要打开就算）。头部印章用 `displayStreak()`：最后答题日是今天或昨天才显示连续天数，否则显示 0。

**保存失败**：`persist()` 抛错（如存储满）时设 `ui.saveFailed`，页面顶部显示红色提示条，下次保存成功自动消失。

**日期**：所有日期都是本地时区的 `YYYY-MM-DD` 字符串，由 `localDateStr()` 生成。不要用 `toISOString()`——它转成 UTC，以前因此在北京时间早上 8 点才换日，复习间隔也每档少一天（2026-09 修复）。

**抽词**：`pickWord()` 从"今天到期的复习词 + 剩余新词额度"里抽，按 `wrongCount + 1` 加权。会排除 `ui.lastWordId`，避免同一个词连续出现两次（词池只剩一个词时除外）。

**测试模式**：英译中 / 中译英，每次随机。两种模式都有"不知道"按钮，等同答错。中译英模式下例句要等答完才显示，因为例句里含目标单词会剧透。答对 0.5 秒后自动下一个；答错会停在答案页（释义 + 例句），点"OK，下一个"或按回车才继续——用户要求的，以前答错 1.8 秒自动跳过、来不及看。达到抄写门槛时按钮变成"OK，去抄写"。回车快捷键在 `init()` 里挂在 document 上，有 400ms 保护，避免提交拼写的那次回车直接把答案页跳过。

**拼写判定**：中译英和打字抄写都用 `spellingMatches()`，不区分大小写、忽略 `.`、连字符和空格等价，括号里的部分可有可无（`onward(s)` 接受 onward / onwards）。两个输入框都关了自动纠错/联想/自动大写（`autocorrect="off" autocapitalize="off" spellcheck="false"`），否则手机键盘会把拼错的词自动改对、或在联想栏直接给出答案。

**提示和发音**：中译英有"提示"按钮，显示首字母 + 下划线（`spellingHint()`），不影响判分；提示是就地取消隐藏，不重新渲染，以免清掉已输入的字母。🔊 按钮用浏览器自带的 `speechSynthesis`（离线可用，不支持就不显示），出现在英译中的单词旁、例句末尾、抄写页、中译英的答错页；中译英作答前不显示，免得泄露答案。

**错词抄写**：累计答错达到 `threshold` 次触发。`settings.copyMode` 三选一：
- `type` 打字抄写，打对 3 遍才完成
- `handwrite` 手写抄写，在纸上抄，点一次"我抄完了"就完成
- `off` 不抄写

**输入法坑**：抄写输入框和中译英输入框的回车处理里都有 `if(e.isComposing || e.keyCode === 229) return;`，用来忽略中文输入法确认候选词的那次回车。以前抄写框没有这行时，按一次回车会被算两次，导致"抄 3 遍"实际只抄 2 遍；中译英框没有时，用回车把字母上屏会直接提交没打完的答案。不要删。

**界面**：现代简洁风（浅灰底、白色圆角卡片、靛蓝主色，2026-10 从米黄笔记本风格改版而来，用户要求）。所有颜色都定义在 `<style>` 开头的 `:root` 变量里，夜间模式在 `@media (prefers-color-scheme: dark)` 里重新定义同一组变量，跟随系统自动切换。新增颜色时两套都要加，不要在样式或 JS 拼的 HTML 里写死 `#fff` 之类的颜色。`<meta name="theme-color">` 也有浅色/深色两条。

## 发布更新的规则

每次改了会被缓存的文件，必须把 `service-worker.js` 里的 `CACHE_NAME` 版本号加一（目前是 `vocab-app-cache-v8`），否则已安装的用户会一直看到旧版。新增文件时还要把它加进 `APP_SHELL` 列表。

## 待办 / 想法

- 可能的升级：把复习算法换成 SM-2（答对时让用户选简单/一般/困难）
- 可能的功能：导出/导入学习记录（换设备时迁移进度）
