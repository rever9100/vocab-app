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

## 文件

- `index.html` —— 全部界面和逻辑（一个大 IIFE）
- `wordbooks-data.js` —— 内置词书数据，挂在 `window.BUILTIN_WORDBOOKS`
  - cet4：4441 词，格式 `[en, zh, exampleEn, exampleCn]`，全部带例句
  - cet6：2083 词，格式 `[en, zh]`，**还没有例句**
- `service-worker.js` —— 离线缓存（cache-first）
- `manifest.json`、`icon-192.png`、`icon-512.png` —— PWA 安装配置和图标
- `README.md` —— 面向用户/访客的软件介绍（不要写成部署操作说明）

## 关键设计

**存储**：localStorage，key 为 `vocab-app-state-v1`，通过 `localStore` 这个异步 shim 访问。早期版本在 claude.ai artifact 里用的是 `window.storage`，已替换。

**状态模型**：`state.words` 是所有已加载的词，每个词带 `book` 字段（`cet4` / `cet6` / `custom`），id 为 `book + ':' + 小写单词`。`state.activeBook` 是当前在背的词书，内置词书在首次选中时才通过 `ensureBookLoaded()` 懒加载进 `state.words`。用户导入的词进入 `custom` 词书（"我的词库"）。`migrateState()` 负责把旧版本存档升级到新结构，改数据结构时必须同步更新它，保证用户已有进度不丢。

**复习（简化艾宾浩斯）**：`REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30]` 天。答对进下一阶段，答错打回第 0 阶段。走完全部阶段算"已掌握"。每日新词额度 `dailyNewGoal`（默认 30）是全局共享的，不按词书分开算。

**抽词**：`pickWord()` 从"今天到期的复习词 + 剩余新词额度"里抽，按 `wrongCount + 1` 加权。会排除 `ui.lastWordId`，避免同一个词连续出现两次（词池只剩一个词时除外）。

**测试模式**：英译中 / 中译英，每次随机。两种模式都有"不知道"按钮，等同答错。中译英模式下例句要等答完才显示，因为例句里含目标单词会剧透。

**错词抄写**：累计答错达到 `threshold` 次触发。`settings.copyMode` 三选一：
- `type` 打字抄写，打对 3 遍才完成
- `handwrite` 手写抄写，在纸上抄，点一次"我抄完了"就完成
- `off` 不抄写

**输入法坑**：抄写输入框的回车处理里有 `if(e.isComposing || e.keyCode === 229) return;`，用来忽略中文输入法确认候选词的那次回车。以前没有这行时，按一次回车会被算两次，导致"抄 3 遍"实际只抄 2 遍。不要删。

## 发布更新的规则

每次改了会被缓存的文件，必须把 `service-worker.js` 里的 `CACHE_NAME` 版本号加一（目前是 `vocab-app-cache-v5`），否则已安装的用户会一直看到旧版。新增文件时还要把它加进 `APP_SHELL` 列表。

## 待办 / 想法

- 六级词书补例句：用户可以从 https://github.com/kajweb/dict 下载 CET6_2 的 zip，解压出 JSON-lines 文件（每行一个词，例句在 `content.word.content.sentence.sentences[0]` 的 `sContent` / `sCn`）。按单词匹配现有 cet6 词表，匹配不上的再手写补。四级当时是这样做的：3618 个用源数据，823 个手写。
- 可能的升级：把复习算法换成 SM-2（答对时让用户选简单/一般/困难）
- 可能的功能：导出/导入学习记录（换设备时迁移进度）
