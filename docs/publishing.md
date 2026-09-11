# 发布与上架 Runbook（Publishing & Listing）

> 面向后续接手长期维护的 Agent/维护者。目标：把新版本安全地发布到 npm、GitHub，并让
> **awesome-dsh-plugin 目录**与 **dsh-market 市场**跟随更新。
>
> 最后更新：2026-09-11（dsh-history 0.1.25）

---

## 0. 渠道一览与权限边界

| 渠道 | 角色 | 我们能否写 | 说明 |
| --- | --- | --- | --- |
| **npm** `dsh-history` | 包发布 | ✅ | `~/.npmrc` 里有 `chenproton` 的 token（**不要打印/提交**） |
| **GitHub** `chenproton/dsh-history` | 仓库/Release | ✅ | remote 是 SSH `git@github.com:chenproton/dsh-history.git`；`gh` 已登录 `chenproton` |
| **awesome-dsh-plugin** | 目录数据源 | ❌（仅 pull） | 只读；不能 push、不能触发 workflow |
| **dshmarket**（市场） | 第三方插件 | ❌ | 作者 `fkysly`，仓库 `dsh-market/dsh-market`，npm 包名 `dshmarket` |
| **dsh-plugin-catalog** | 目录的 npm 载体 | ❌ | awesome 项目发布；市场 China 区优先读它 |
| 其它 Awesome 列表 | 第三方收录 | ❌ | 见 §6 |

**关键结论：`dsh-history` 只要发布到 npm，目录与市场会在其下一次重建后自动跟随；不需要（也无法）单独向 dsh-market「投稿」。**

---

## 1. 发布前检查（Pre-flight）

1. 确认目标版本号，同时改三处：
   - `package.json` → `version`
   - `dsh.plugin.json` → `version`
   - `README.md` / `README.en.md` → 追加对应的 vX.Y.Z 变更记录
2. 构建与类型检查（`lib/` 是**提交进仓库**的，git 直装依赖它）：
   ```bash
   cd /root/projects/dsh-history
   pnpm install            # 首次或依赖变化时
   pnpm build              # rm -rf lib && tsc -p tsconfig.build.json && tsdown ...
   pnpm typecheck
   ```
3. 自查 `git status`：应包含 `src/`、`lib/`、`package.json`、`dsh.plugin.json`、两个 README。
   `registry/` 是 gitignore 的暂存目录，**不要提交**。
4. 提交：
   ```bash
   git add -A
   git commit -m "fix|feat|chore: <一句话>"
   ```

> 兼容性补充：插件源码用**结构化类型**对接宿主，不直接 import DSH 包；升级 DSH 时先核对
> `conversation.input.dock` 的 owner/standard props、`SessionSnapshot`、`session.snapshotEvents()`、
> `data-chat-anchor-key` 等契约（参见 `src/client/util.ts`、`src/index.ts` 注释）。

---

## 2. GitHub 发布（tag + Release）

```bash
git push origin main
git tag -f vX.Y.Z
git push origin vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file /tmp/release-notes.md
```

- Release 的 **tag 必须等于** `v` + `package.json.version`，否则 `.github/workflows/release.yml` 第一步就会报错退出。
- Release 发布（`release: published`）会自动触发该 workflow：build → typecheck → `pnpm publish`。
- 只有 `release` 事件会真正发布；也可以手动 `workflow_dispatch` 且 `dry_run=true` 做纯校验。

---

## 3. npm 发布

### 3.1 首选：Trusted Publishing（CI，带 provenance）

由 §2 的 Release 触发 `.github/workflows/release.yml`，用 GitHub OIDC 发布，**不需要 NPM_TOKEN**。

**一次性前置（npm 网页端，只能人工做）：**
npmjs.com → `dsh-history` → Settings → **Publishing access → Trusted Publishers → Add**：
- Provider: GitHub Actions
- Organization/user: `chenproton`
- Repository: `dsh-history`
- Workflow filename: `release.yml`
- Environment: 留空

也可用 CLI（需要**带 package-settings 权限**的 token）：
```bash
npm trust github dsh-history --file release.yml --repo chenproton/dsh-history --allow-publish
npm trust list dsh-history     # 校验（当前 token 可能 403，见下）
```

> ⚠️ 本机 `~/.npmrc` 的 token 只有发布权：`npm trust list` 会 **403**。管理 Trusted Publisher
> 需要网页登录，或另建一个带 package-settings 权限的 granular token。

### 3.2 兜底：本机直发（无 provenance）

CI 不可用（例如 Trusted Publisher 未配置）时：
```bash
npm publish --access public        # prepublishOnly 会自动跑 pnpm build
```
- 发布后 **不要再对同一个版本重跑 Release workflow**，否则会因「版本已存在」失败；后续版本再走 CI。
- 直接发布**不会**附带 provenance 证明（CI 发布才有）。

### 3.3 校验

```bash
npm view dsh-history version dist-tags --json
npm view dsh-history time.0.1.25 --json
```

---

## 4. 目录站与市场（awesome-dsh-plugin ↔ dsh-market）

### 4.1 数据流

```
awesome-dsh-plugin/awesome-dsh-plugin  (GitHub 仓库)
  data/plugins/<owner>__<repo>.yml      ← 一条投稿 = 一个文件（只含 URL/名称/分类/描述）
  scripts/probe-npm.mjs                 ← 从 npm 探测 dist-tags.latest → data/npm-map.json
  scripts/build-site.mjs                ← 生成 plugins.json
        │
        ├─ 发布到 https://awesome-dsh-plugin.com/plugins.json   (GitHub Pages/CDN)
        └─ 发布 npm 包 dsh-plugin-catalog（内含 plugins.json）

dshmarket（市场，读取上面两个来源）
  - global 区：优先 CATALOG_OFFICIAL = https://awesome-dsh-plugin.com/plugins.json
  - china 区 ：优先 npm 包 dsh-plugin-catalog，再回退 CATALOG_OFFICIAL
  - 「更新检查」另有直连：updates.js 直接读 npm packument 的 dist-tags.latest
```

**含义：**
- 目录里的 `version` 字段是**自动**从 npm 探测的 → 发完 npm 无需手工改版本。
- 市场对**已安装插件**的「可更新」判断直连 npm，通常比目录更快反映新版本。
- 目录浏览页的版本要等 awesome 项目重建并发布 `plugins.json` / `dsh-plugin-catalog`。

### 4.2 重建时机

- `awesome-dsh-plugin` 仓库的 `build-site.yml`：**每天 02:23 cron** + `workflow_dispatch` + 任意 push 到 main。
- 我们对该仓库**只有 pull 权限**，无法手动触发；只能等它的定时任务（或等维护者修复/合并）。

### 4.3 校验目录是否已跟上

```bash
# 站点 JSON
curl -s --compressed https://awesome-dsh-plugin.com/plugins.json -o /tmp/plugins.json
node -e 'const d=require("/tmp/plugins.json");console.log(d.plugins.find(p=>p.name==="dsh-history"))'

# npm 载体（china 区优先来源）
npm view dsh-plugin-catalog version time.modified --json
```

### 4.4 已知上游阻塞（2026-09 状态）

awesome 项目的构建管道当时是坏的，目录停更，别误判成我们的发布问题：
- **#4847** `pr-check` → Build 对**每个** PR 都失败（2026-09-11）
- **#4759** `plugins.json` snapshot 缺失已合入 main 的条目（2026-09-10）
- **#4731** `build-site` 的 added-date 推导漏掉 merge commit 引入的条目（2026-09-09）

处理方式：先确认 npm 已发布成功，再去 awesome 仓库确认是否已修复；**不要**因为目录没更新就重复发版。

### 4.5 首次收录（新插件才需要）

按 `awesome-dsh-plugin/awesome-dsh-plugin` 的 `contributing.md`：新增**一个**文件
`data/plugins/<owner>__<repo>.yml`，然后开 PR。**不要手改生成的 README**。格式：

```yaml
url: https://github.com/chenproton/dsh-history
name: chenproton/dsh-history
category: session
description:
  en: One-line description ending with a period.
  zh: 一句话描述，以句号结尾。
```

前置要求：`package.json` 声明 `dsh.bundle`（本仓库已有 `dsh.bundle.patch`）。

---

## 5. dsh-history 各安装通道

| 通道 | 命令 / 说明 |
| --- | --- |
| npm（推荐） | `dsh plugin --profile web add dsh-history@latest` |
| GitHub 直装 | `dsh plugin --profile web add github:chenproton/dsh-history#main` |
| 源码 link | 构建后 link: 到本地克隆，并在 profile 的 `cordis.patch.yml` 追加挂载行 |
| plugin-registry | ⚠️ DSH 0.1.5 已无 `dsh registry` 子命令，此通道仅适用于集成了 plugin-registry 的旧部署；`scripts/package-registry.mjs` 会生成 `registry/` 暂存（gitignore） |

---

## 6. 其它「之前上架过」的平台

以下均为第三方 Awesome 列表，只存**链接**、不存版本号，因此发 npm 后无需逐条改版本；
其中带自动同步的仓库会自行跟随：

| 仓库 | 自动化 | 备注 |
| --- | --- | --- |
| `awesome-dsh-plugin/awesome-dsh-plugin` | `build-site.yml` 定时 | 主目录，见 §4 |
| `0xsline/awesome-deepseek-harness` | `.github/workflows/sync-catalog.yml` | 自动同步 |
| `fendouai/awesome-deepseek-harness` | `.github/workflows/discover.yml` | 自动发现 |
| `Zhiyuan-Fan/Awesome-DeepSeek-Harness-Plugins` | 无 | 静态 README，必要时人工 PR |
| `anbeime/skill` | 无 | 仅提及 |

> 若要在这些仓库提交更新，先确认当前账号是否有对应写权限；没有就 fork + PR。

---

## 7. 让本机 profile 生效

```bash
dsh plugin --profile web add dsh-history@latest
bash ~/.dsh/profiles/web/node_modules/dsh-history/restart-dsh-web.sh
```

- **客户端半**：服务端按请求重算 client bundle 的 `rev`，通常**刷新浏览器**即生效。
- **宿主半**（`lib/index.mjs`）：需重启 `dsh web` 才加载。
- ⚠️ 重启会**中断正在运行的 agent/会话**。在有活跃会话时，优先只用「刷新浏览器」验证客户端改动，重启交给用户或空闲时执行。
- `restart-dsh-web.sh` 优先 systemd；支持 `-n` 预览、`-p PID`、`-l LOG`。

---

## 8. 发布后校验清单

- [ ] `npm view dsh-history version` == 目标版本，且 `dist-tags.latest` 指向它
- [ ] GitHub：`main` 有新提交、tag `vX.Y.Z` 存在、Release 存在（`gh release view vX.Y.Z`）
- [ ] CI：`gh run list` / `gh run watch <id>` 的 Publish 步骤成功（失败见 §9）
- [ ] 目录：`plugins.json` 与 `dsh-plugin-catalog` 中该插件 `version` 已更新
- [ ] profile：`node -p "require('<profile>/node_modules/dsh-history/package.json').version"` == 目标版本
- [ ] 运行中的 GUI：刷新后插件面板可用（定位/跳转、搜索、复制）

---

## 9. 常见故障排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| CI Publish 报 `404 PUT .../dsh-history`，但 provenance 已生成 | npm 端未配置 Trusted Publisher（或 repo/workflow 不匹配） | 按 §3.1 配置；当前版本用 §3.2 直发兜底 |
| `npm trust` → `403` | token 无 package-settings 权限 | 换 granular token 或走网页 |
| 重新跑同版本 Release 失败 | 版本已在 npm 存在，npm 不允许覆盖 | 只发新版本，不要覆盖旧版本 |
| tag 与 package.json 版本不一致 | tag 必须是 v 加版本号 | 修正 tag 或版本号后重来 |
| 目录/市场仍显示旧版本 | awesome 上游构建停更（§4.4） | 确认 npm 已发，等上游；必要时到上游 issue 反馈 |
| 市场 China 区读到旧数据 | China 区优先读 `dsh-plugin-catalog` npm 包 | 等该包重发；或用 `DSHM_REGISTRY_URL` 覆盖（见 dshmarket `regions.js`） |
| git 直装缺 `lib/` | `lib/` 未提交或未 build | 跑 `pnpm build` 后把 `lib/` 一并提交 |

---

## 10. 交接注意事项（给后续 Agent）

- `~/.npmrc` 与 `gh` 登录态含凭证：**不要**读取/打印 token，不要提交到仓库。
- `lib/` 是提交产物；改动 `src/` 后必须 `pnpm build` 并提交 `lib/`。
- `registry/` 是 gitignore 的暂存目录，由 `scripts/package-registry.mjs` 生成。
- 本仓库的发布凭据/权限可能变化：动手前先跑 §0 的渠道核对（`git remote -v`、`npm whoami`、`gh auth status`）。
- **不要**在未确认的情况下重启 `dsh web`：它会中断当前会话。
