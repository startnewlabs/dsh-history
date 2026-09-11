# dsh-history

DSH web 插件：在超长会话里**快速查看、搜索并跳转到所有"你发送"的消息**。

[English](README.en.md) | 中文

## 功能介绍

- **完整历史**：列出当前会话中**全部**你发送的消息，包括尚未加载进对话窗口的旧页、被 compaction 覆盖的历史。
- **一键定位**：点击消息 → 全自动定位（未加载则自动加载更早历史，页面未渲染则自动等待，就绪后平滑滚动 + 闪烁高亮并关闭面板）。
- **排序切换**：默认最新在前，工具栏一键切换"最新在前 / 最早在前"。
- **搜索过滤**：按消息文本实时过滤。
- **一键复制**：每行复制按钮，一键复制完整消息文本。
- **快速启动**：进入会话即后台预取完整列表，打开面板秒开；Host 侧带缓存。

## 🚀 安装

**前置**：已装好 DSH（`dsh web` 能正常运行）。

```bash
# 1. 安装插件
dsh plugin --profile web add dsh-history@latest

# 2. 自动重启服务生效（脚本随插件一起安装，无需下载）
bash ~/.dsh/profiles/web/node_modules/dsh-history/restart-dsh-web.sh
```

装完每个会话输入框上方自动出现 **"我的消息 (N)"**，无需手动操作。

---

## 常见问题

<details>
<summary><b>如何更新插件？</b></summary>

```bash
dsh plugin --profile web update dsh-history
# 或直接装最新版
dsh plugin --profile web add dsh-history@latest
```

改完运行 `bash ~/.dsh/profiles/web/node_modules/dsh-history/restart-dsh-web.sh`（或硬刷新浏览器）即可。

</details>

<details>
<summary><b>如何从 GitHub 直接安装（不经过 npm）？</b></summary>

```bash
dsh plugin --profile web add github:chenproton/dsh-history#main
# 或完整 URL 形式
dsh plugin --profile web add https://github.com/chenproton/dsh-history.git#main
```

装完后同样运行 `bash ~/.dsh/profiles/web/node_modules/dsh-history/restart-dsh-web.sh`。此方式直接使用仓库已提交的构建产物，无需本地构建。

</details>

<details>
<summary><b>如何从源码安装 / 开发调试？</b></summary>

调试本地改动或跟随开发分支时，把依赖指向本地克隆并自行构建：

```bash
# 1. 克隆并构建
git clone https://github.com/chenproton/dsh-history.git ~/Code/dsh-history
cd ~/Code/dsh-history && pnpm install && pnpm build

# 2. 把依赖指向本地克隆
#    编辑 ~/.dsh/profiles/web/package.json 的 dependencies：
#    "dsh-history": "link:<克隆目录绝对路径>"

# 3. 追加挂载行到 ~/.dsh/profiles/web/cordis.patch.yml：
#    - insert:
#        - id: dsh-history
#          name: 'dsh-history'

# 4. 在 profile 目录安装
cd ~/.dsh/profiles/web && pnpm install

# 5. 重启生效（脚本在克隆目录里）
bash ~/Code/dsh-history/restart-dsh-web.sh
```

**更新**：`git pull && pnpm install && pnpm build` → `bash ~/Code/dsh-history/restart-dsh-web.sh`。

**切回 npm 通道**：把依赖改回 `"dsh-history": "^0.1.13"` 再 `pnpm install`，并移除手动挂载行（避免双挂载）。

</details>

<details>
<summary><b>如何通过 plugin-registry 安装？</b></summary>

> 前置：DSH 已集成 plugin-registry（`dsh registry` 命令可用）。同时启用两个通道会双挂载（Node 半挂两次、页面两个面板）。

```bash
git clone https://github.com/chenproton/dsh-history.git && cd dsh-history
pnpm install && pnpm build
node scripts/package-registry.mjs      # 组装 registry/ 暂存（含清单 + 产物 + README，不入库）
dsh registry install ./registry        # 安装（默认禁用）
dsh registry enable dsh-external/dsh-history
bash restart-dsh-web.sh                # 自动重启生效
```

**更新**：`git pull && pnpm install && pnpm build` → `node scripts/package-registry.mjs` → `dsh registry uninstall/install/enable` → `bash restart-dsh-web.sh`。切换通道前先移除另一通道的挂载。

</details>

<details>
<summary><b>restart-dsh-web.sh 是什么？报 "No such file or directory"？</b></summary>

它是随插件一起分发的**一键重启脚本**：自动探测部署方式并重启 DSH Web 让插件生效——

- 本机由 **systemd** 管理（`dsh-web.service`）→ 自动走 `systemctl restart`（干净单实例）；
- 否则自动发现运行中的 `dsh web` 进程，读取原始启动参数原样重启（nohup）；
- 找不到进程时直接用 `dsh web` 启动。

报 `No such file or directory` 是因为脚本不在当前 shell 目录——请用完整路径，或先拷贝到当前目录：

```bash
# 直接用包内脚本（完整路径，任意目录可执行）
bash ~/.dsh/profiles/web/node_modules/dsh-history/restart-dsh-web.sh

# 或拷贝到当前目录后运行
cp ~/.dsh/profiles/web/node_modules/dsh-history/restart-dsh-web.sh ~/restart-dsh-web.sh
bash ~/restart-dsh-web.sh

# 或未装包时从仓库下载
curl -O https://raw.githubusercontent.com/chenproton/dsh-history/main/restart-dsh-web.sh
bash restart-dsh-web.sh
```

参数：`-n` 预览将执行的命令（dry-run）、`-p PID` 指定进程、`-l 文件` 指定日志。

</details>

<details>
<summary><b>安装时出现 "✕ missing peer" 警告？</b></summary>

可安全忽略。DSH 运行时通过自身 module table 提供 `@deepseek-ai/*` 与 react 等依赖，无需在 profile 中重复安装（官方插件同样如此）。

</details>

<details>
<summary><b>装完看不到 "我的消息"？</b></summary>

1. 确认重启过服务（运行 `restart-dsh-web.sh`）或硬刷新浏览器（Cmd/Ctrl+Shift+R）；
2. 确认插件已加入 bundle：`cat ~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 应含 `dsh-history`；
3. 仍不行，把 `dsh plugin --profile web list` 的输出发到 issue 反馈。

</details>

---

## 使用

1. 点击输入框上方的 **"我的消息 (N)"**（N = 当前会话中你发送过的消息总数）。
2. 面板展开：搜索框 + 排序切换 + 消息列表（时间戳 + 文本预览 + 状态标签）。
3. 状态标签：
   - **可定位**（绿）= 消息已在当前对话窗口 → 点击自动滚动定位 + 高亮。
   - **未加载**（灰）= 消息在更早的历史 → 点击自动加载更早历史并定位。
   - **定位中…**（黄）= 正在加载/等待渲染以定位该消息。
4. 每行右侧 `⧉` 复制按钮一键复制完整文本（成功变 `✓`，1.4 秒后自动恢复）。

## 版本更新记录

### v0.1.25

- **兼容 DSH 0.1.5**：`conversation.input.dock` 的 `session` 已由会话快照改为
  `SessionSnapshot`（不再含 `chat`），Chat 节点改从标准注入的 `useChat` 选择器
  钩子读取——修复"完整历史能列出、但点击无法定位/跳转"的问题；
- **兼容 DSH 0.1.5**：宿主侧会话日志由已移除的 `session.events` 改为
  `session.snapshotEvents()`（保留旧 getter 回退），恢复内存直读快路径。

### v0.1.20

- 文档：新增 **English 版本 README.en.md**，中英文顶部互链；README.en.md 同步进入
  npm 包与 registry 分发。

### v0.1.19

- 代码精简：抽取纯工具函数到 `src/client/util.ts`，组件文件瘦身、统一重复逻辑，
  功能与行为不变（内部重构）。

### v0.1.18

- 修复：点击"可定位"消息时不再依赖异步 `scrollIntoView`，改为直接定位对话
  滚动容器（`getBoundingClientRect` 居中），同步可靠滚动，面板开合不影响。

### v0.1.17

- 修复：重启脚本自动**清理占用端口的残留 dsh web 进程**（识别 cmdline 匹配
  `dsh web` 的进程自动停止），并做 HTTP 健康检查确认真就绪；非 dsh 进程
  不误杀。

### v0.1.16

- 修复：重启脚本升级——端口占用诊断、HTTP 健康检查（不再误信 `is-active`，
  systemd 下进程 fork 即显示 active 但可能随即崩溃）。

### v0.1.15

- 修复：重启脚本轮询等待服务激活最多 30 秒（替代固定 3 秒，适配慢启动），
  失败时自动输出 `systemctl status` + journal 日志。

### v0.1.14

- 文档：安装章节精简为最推荐的 npm 方式；GitHub / 源码 / registry / 脚本 /
  peer 警告等全部移入"常见问题"并用折叠方式展示。

### v0.1.11

- 新增配套脚本 **`restart-dsh-web.sh`**：安装/更新插件后一键自动重启 DSH Web 生效。
  自动探测部署方式（systemd 服务 / 裸进程原样重启 / 直接启动），支持 `-n` 预览、
  `-p` 指定 PID、`-l` 指定日志。

### v0.1.9

- 安装方式扩展：新增 **GitHub 直装**、**源码 link 安装**、**plugin-registry** 三种
  通道（含 `scripts/package-registry.mjs` 组装脚本与 registry 专用 client bundle）。

### v0.1.7

- 体验：点击消息后**全自动定位**——节点未加载则自动加载更早历史；
  节点已加载但页面尚未渲染到该位置时，自动等待渲染（最多 1.5 秒重试），
  就绪后自动滚动 + 高亮并关闭面板，无需用户手动滚动；
- 定位期间对应行显示"定位中…"，仅真正的失败（加载失败/到达最早记录）才提示。

### v0.1.5

- 性能/稳定性：完整历史改为**优先读取会话内存日志**（无持久化读取、无重放校验），
  仅对非活动会话回退到完整日志读取——大幅降低"请求超时"出现的频率；
- 请求超时上限放宽至 15 秒，适配超大会话；
- 体验：提示信息移到面板顶部并加高亮底色，始终可见。

### v0.1.3

- 稳定性：完整历史请求加入 15 秒超时，失败时显示"重试"按钮；
- 稳定性：自动加载更早历史加入页数上限（30 页），防止异常循环；
- 性能：客户端/服务端缓存均有大小上限，长时间使用不泄漏内存；
- 体验：复制成功反馈 1.4 秒后自动恢复；当天消息只显示时间（`HH:mm`）；
- 体验：超长历史只渲染最近 200 条并提示，列表滚动不再卡顿；
- 体验：支持 `Esc` 关闭面板，列表项键盘可达（Enter/空格跳转），补充无障碍标签。

### v0.1.1

- 性能优化：进入会话即**后台预取**完整消息列表，打开面板秒开；
- Host 侧新增 5 秒会话级缓存，重复打开/切换会话不再重读完整日志。

### v0.1.0

- 首个版本：完整历史列表、一键滚动定位 + 高亮、自动加载更早历史、最新/最早排序切换、文本搜索、一键复制。

## License

MIT
