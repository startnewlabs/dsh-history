window.__ModuleLoader__.load({
	id: "dsh-external/dsh-history",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client/i18n.ts
		const TABLES = {
			zh: {
				fetchFail: "读取完整历史失败",
				timeout: "请求超时",
				scrollMiss: "已定位到该消息，但页面滚动未生效，请再点击一次。",
				rendering: "该消息正在渲染中，暂时无法定位。请稍候再试。",
				locating: "正在定位该消息…",
				autoLoadGiveUp: "连续加载 {pages} 页仍未找到该消息，已停止。可尝试向上滚动加载更早内容后重试。",
				loadingEarlier: "正在加载更早历史以定位该消息…",
				loadEarlierFail: "加载更早历史失败，无法定位该消息。",
				earliestNotFound: "已加载到该会话最早的记录，仍未找到这条消息（可能已被删除）。",
				noAutoLoad: "这条消息位于更早的历史中，尚未加载到当前对话窗口。当前环境无法自动加载更早历史，可先向上滚动加载。",
				copyFail: "复制失败。",
				badgeAria: "我的消息",
				badge: "我的消息 ({count})",
				searchPlaceholder: "搜索我发过的消息…",
				newestFirst: "最新在前",
				oldestFirst: "最早在前",
				loading: "正在读取完整历史…",
				loadErrorPrefix: "完整历史读取失败：{error}（当前仅显示已加载窗口内的消息）",
				unknownError: "未知错误",
				retry: "重试",
				tagPending: "定位中…",
				tagJumpable: "可定位",
				tagNotLoaded: "未加载",
				noText: "(无文本)",
				jumpAria: "跳转到：{text}",
				copied: "已复制",
				copyText: "复制文本",
				copyAria: "复制消息文本",
				capNotice: "仅显示最近 {shown} 条匹配消息（共 {total} 条）；使用搜索框可缩小范围。",
				emptyFiltered: "没有匹配的消息。",
				emptySession: "这个会话里还没有你发起的消息。",
				moreNotice: "已显示全部 {total} 条你发送的消息；{beyond} 条位于已加载窗口之外（点击可自动加载并定位，或先向上滚动加载）。",
				imagePlaceholder: "[图片]",
				toolCall: "[工具: {name}]"
			},
			en: {
				fetchFail: "Failed to read the full history",
				timeout: "Request timed out",
				scrollMiss: "Found the message, but the page did not scroll — click it once more.",
				rendering: "That message is still rendering; try again in a moment.",
				locating: "Locating that message…",
				autoLoadGiveUp: "Stopped after loading {pages} pages without finding the message. Scroll up to load earlier history and retry.",
				loadingEarlier: "Loading earlier history to locate that message…",
				loadEarlierFail: "Failed to load earlier history; cannot locate that message.",
				earliestNotFound: "Reached the earliest record of this session without finding the message (it may have been deleted).",
				noAutoLoad: "That message is in earlier history that is not loaded into the conversation window yet. Auto-load is unavailable here — scroll up to load it first.",
				copyFail: "Copy failed.",
				badgeAria: "My messages",
				badge: "My messages ({count})",
				searchPlaceholder: "Search the messages you sent…",
				newestFirst: "Newest first",
				oldestFirst: "Oldest first",
				loading: "Reading the full history…",
				loadErrorPrefix: "Failed to read the full history: {error} (showing only messages in the loaded window)",
				unknownError: "unknown error",
				retry: "Retry",
				tagPending: "Locating…",
				tagJumpable: "Jumpable",
				tagNotLoaded: "Not loaded",
				noText: "(no text)",
				jumpAria: "Jump to: {text}",
				copied: "Copied",
				copyText: "Copy text",
				copyAria: "Copy message text",
				capNotice: "Showing only the newest {shown} matches (of {total}); narrow it down with the search box.",
				emptyFiltered: "No matching messages.",
				emptySession: "You have not sent any messages in this session yet.",
				moreNotice: "Showing all {total} messages you sent; {beyond} are outside the loaded window (click to auto-load and locate, or scroll up first).",
				imagePlaceholder: "[image]",
				toolCall: "[tool: {name}]"
			}
		};
		let lang = "en";
		try {
			const nav = typeof navigator !== "undefined" ? navigator.language || "" : "";
			if (/^zh/i.test(String(nav))) lang = "zh";
		} catch {}
		/** Translate `key` in the active language, interpolating {param} placeholders. */
		function t(key, params) {
			let template = TABLES[lang][key] ?? TABLES.en[key] ?? String(key);
			if (params !== void 0) for (const [k, v] of Object.entries(params)) template = template.split(`{${k}}`).join(String(v));
			return template;
		}
		/** Adopt the host's resolved locale when it reports zh/en. */
		function syncHostLocale(ctx) {
			try {
				const snap = ctx.locale?.snapshot?.();
				const code = String(snap && (snap.active ?? snap.locale ?? snap.language) || "");
				if (/^zh/i.test(code)) lang = "zh";
				else if (/^en/i.test(code)) lang = "en";
			} catch {}
		}
		/** Test seam: pin the language. */
		function setLang(next) {
			lang = next;
		}
		//#endregion
		//#region src/client/util.ts
		/**
		* Pure helpers for the dsh-history client half. No React, no plugin services —
		* only thin DOM/browser helpers and data transforms. Kept in one file so the
		* component (index.ts) stays focused on rendering and state, and so utility
		* logic is testable in isolation.
		*/
		/** Flatten one message's content blocks to a single preview string. */
		function textOf(content) {
			if (!Array.isArray(content)) return "";
			const parts = [];
			for (const b of content) if (b && b.type === "text" && typeof b.text === "string") parts.push(b.text);
			else if (b && b.type === "image") parts.push(t("imagePlaceholder"));
			else if (b && b.type === "tool-call" && typeof b.name === "string") parts.push(t("toolCall", { name: b.name }));
			return parts.join(" ").replace(/\s+/g, " ").trim();
		}
		/** Format a Unix epoch ms timestamp: same-day → HH:mm; else YYYY-MM-DD HH:mm. */
		function fmtTime(ms) {
			if (!ms || typeof ms !== "number") return "";
			try {
				const d = new Date(ms);
				const now = /* @__PURE__ */ new Date();
				const pad = (n) => String(n).padStart(2, "0");
				const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
				const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
				if (sameDay) return time;
				return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`;
			} catch {
				return "";
			}
		}
		/** Collect the user/steering messages in the loaded window + seq→key map. */
		function collectWindowItems(chat) {
			const items = [];
			const keys = /* @__PURE__ */ new Map();
			if (!chat || !chat.nodes) return {
				items,
				keys
			};
			let nodes = [];
			try {
				nodes = chat.nodes.values();
			} catch {
				nodes = [];
			}
			for (const node of nodes) {
				if (!node) continue;
				if (node.kind !== "user" && node.kind !== "steering") continue;
				if (node.visibility === "hidden") continue;
				const data = node.data || {};
				const seq = typeof node.anchorSeq === "number" ? node.anchorSeq : typeof data.seq === "number" ? data.seq : 0;
				if (typeof node.key === "string" && node.key) keys.set(seq, node.key);
				items.push({
					seq,
					time: typeof data.time === "number" ? data.time : 0,
					text: textOf(data.content),
					key: typeof node.key === "string" ? node.key : null
				});
			}
			items.sort((a, b) => a.seq - b.seq);
			return {
				items,
				keys
			};
		}
		/** Find the conversation row DOM element for a chat-node anchor key. */
		function findAnchor(key) {
			if (typeof document === "undefined") return null;
			const rows = document.querySelectorAll("[data-chat-anchor-key]");
			for (let i = 0; i < rows.length; i++) {
				const row = rows[i];
				if (row && row.dataset && row.dataset.chatAnchorKey === key) return row;
			}
			return null;
		}
		/** Scroll a message row into view (centered) and flash-highlight it.
		*  Positions the conversation scrollport directly (synchronous, reliable),
		*  rather than relying on async scrollIntoView which can silently no-op. */
		function scrollToKey(key) {
			const el = findAnchor(key);
			if (!el) return false;
			try {
				el.classList.remove("dshm-flash");
				el.offsetWidth;
				el.classList.add("dshm-flash");
				el.addEventListener("animationend", () => el.classList.remove("dshm-flash"), { once: true });
				let port = null;
				let node = el.parentElement;
				while (node !== null) {
					const overflow = getComputedStyle(node).overflowY;
					if (overflow === "auto" || overflow === "scroll" || overflow === "overlay") {
						port = node;
						break;
					}
					node = node.parentElement;
				}
				if (port !== null) {
					const elRect = el.getBoundingClientRect();
					const portRect = port.getBoundingClientRect();
					const target = port.scrollTop + elRect.top - portRect.top - portRect.height / 2 + elRect.height / 2;
					if (Math.abs(target - port.scrollTop) > 1) port.scrollTop = target;
					return true;
				}
				try {
					el.scrollIntoView({
						behavior: "smooth",
						block: "center"
					});
				} catch {
					return false;
				}
				return true;
			} catch {
				return false;
			}
		}
		/** Copy text to the clipboard (Clipboard API first, execCommand fallback). */
		function copyText(text) {
			if (!text) return Promise.resolve(false);
			if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
			return Promise.resolve(fallbackCopy(text));
		}
		function fallbackCopy(text) {
			if (typeof document === "undefined") return false;
			try {
				const ta = document.createElement("textarea");
				ta.value = text;
				ta.style.position = "fixed";
				ta.style.opacity = "0";
				document.body.appendChild(ta);
				ta.select();
				const ok = document.execCommand("copy");
				document.body.removeChild(ta);
				return ok;
			} catch {
				return false;
			}
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-history client half: a dock row above the composer ("我的消息 (N)") that
		* lists EVERY message the human sent in the current session — the full log,
		* including pages not yet loaded into the conversation window.
		*
		* Reuses DSH-native interfaces where possible:
		* - `conversation.input.dock` slot for the entry point;
		* - the product's `data-chat-anchor-key` semantic anchor + `session.loadOlder()`
		*   for jump/auto-load (see util.ts);
		* - `ctx.timer` for the copy-feedback restore.
		* Pure helpers live in ./util.ts; this file only renders and manages state.
		*/
		/** ------------------------------------------------------------------ styles */
		const CSS = `
.dshm_root{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) * 2 - var(--dsh-composer-dock-inset) * 2);max-width:calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) * 2);margin:0 auto;padding:0 var(--dsh-composer-dock-inset);font-family:Inter,var(--dsw-font-family)}
.dshm_trigger{box-sizing:border-box;width:100%;height:36px;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;background:var(--dsw-specific-tip);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;align-items:center;gap:10px;padding:4px 12px;font-size:13px;font-weight:500;line-height:20px;display:flex}
.dshm_trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshm_badge{flex:auto;min-width:0;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.dshm_chevron{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px}
.dshm_panel{box-sizing:border-box;background:var(--dsw-specific-tip);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;margin-top:6px;overflow:hidden}
.dshm_toolrow{box-sizing:border-box;align-items:center;gap:8px;margin:8px 8px 0;padding:0;display:flex}
.dshm_search{box-sizing:border-box;width:100%;height:32px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;outline:none;padding:0 10px;font:inherit;font-size:13px;line-height:20px;flex:auto;min-width:0}
.dshm_search:focus{border-color:var(--dsw-alias-state-business-primary)}
.dshm_search::placeholder{color:var(--dsw-alias-label-caption)}
.dshm_order{height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:var(--dsw-alias-interactive-bg-hover);border:none;border-radius:8px;padding:0 10px;font-size:12px;font-weight:500;line-height:20px;flex:none;white-space:nowrap}
.dshm_order:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dshm_list{max-height:264px;margin:6px 0 0;padding:0 6px 8px;list-style:none;overflow-y:auto}
.dshm_row{box-sizing:border-box;border-radius:8px;align-items:center;gap:10px;width:100%;padding:6px 8px;font-size:13px;line-height:18px;display:flex}
.dshm_row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshm_time{flex:none;color:var(--dsw-alias-label-caption);font-size:11px;line-height:18px;white-space:nowrap;font-variant-numeric:tabular-nums}
.dshm_text{min-width:0;color:var(--dsw-alias-label-primary-dimmed);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;flex:auto;cursor:pointer}
.dshm_copy{width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;place-items:center;padding:0;display:grid;font-size:12px}
.dshm_copy:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshm_tag{flex:none;color:var(--dsw-alias-label-caption);font-size:11px;line-height:18px;white-space:nowrap;cursor:pointer}
.dshm_tagLoaded{flex:none;color:var(--dsw-alias-state-success-primary);font-size:11px;line-height:18px;white-space:nowrap}
.dshm_tagPending{flex:none;color:var(--dsw-alias-state-warn-primary);font-size:11px;line-height:18px;white-space:nowrap}
.dshm_empty{color:var(--dsw-alias-label-tertiary);padding:8px;font-size:13px;line-height:20px}
.dshm_notice{color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-tertiary);border-radius:8px;margin:8px 8px 0;padding:6px 10px;font-size:12px;line-height:18px}
.dshm_loading{color:var(--dsw-alias-label-caption);padding:8px;font-size:12px;line-height:18px}
.dshm_error{color:var(--dsw-alias-state-error-primary);padding:8px;font-size:12px;line-height:18px}
.dshm_retry{height:24px;color:var(--dsw-alias-state-error-primary);cursor:pointer;background:var(--dsw-alias-interactive-bg-hover-danger);border:none;border-radius:6px;margin-left:8px;padding:0 10px;font-size:12px;line-height:20px;vertical-align:middle}
.dshm_retry:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshm_flash{animation:dshmFlash 1.6s ease-out}
.dshm_recall{box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) * 2);height:26px;color:var(--dsw-alias-label-tertiary);margin:0 auto;padding:0 var(--dsh-composer-dock-inset);align-items:center;justify-content:center;gap:6px;font-size:12px;line-height:18px;user-select:none;display:flex}
.dshm_recallGlyph{opacity:.75}
@keyframes dshmFlash{0%,25%{box-shadow:0 0 0 3px var(--dsw-alias-state-business-primary)}100%{box-shadow:0 0 0 3px transparent}}
@media (prefers-reduced-motion:reduce){.dshm_flash{animation:none}}
`;
		/** Inject the plugin stylesheet once per activation (removed on disposal). */
		function injectStyles() {
			if (typeof document === "undefined") return () => {};
			if (document.querySelector("style[data-plugin-css=\"dsh-history/styles\"]") !== null) return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-history";
			tag.dataset.pluginCss = "dsh-history/styles";
			tag.textContent = CSS;
			document.head.appendChild(tag);
			return () => {
				if (tag.parentNode !== null) tag.parentNode.removeChild(tag);
			};
		}
		/** ------------------------------------------------------------------ data */
		/**
		* module-level prefetch cache: sessionId → full-history items. The dock
		* prefetches on mount (every session renders its own dock), so opening the
		* panel reads this cache and renders instantly. Bounded to avoid leaks.
		*/
		const prefetchCache = /* @__PURE__ */ new Map();
		const PREFETCH_TTL = 1e4;
		const FETCH_TIMEOUT = 15e3;
		const PREFETCH_CACHE_MAX = 20;
		const MAX_AUTO_LOAD_PAGES = 30;
		const MAX_LOCATE_RETRIES = 10;
		const MAX_RENDERED_ROWS = 200;
		/** Fetch the full history for a session (network + re-cache, with timeout). */
		function fetchFullHistory(sessionId) {
			const controller = typeof AbortController === "undefined" ? void 0 : new AbortController();
			const timer = controller !== void 0 && typeof setTimeout === "function" ? setTimeout(() => {
				controller.abort();
			}, FETCH_TIMEOUT) : void 0;
			return fetch(`/history/api/list-user-messages`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ sessionId }),
				signal: controller?.signal
			}).then((res) => res.ok ? res.json() : Promise.reject(/* @__PURE__ */ new Error(`HTTP ${res.status}`))).then((data) => {
				const record = data;
				if (record && record.ok === true && Array.isArray(record.items)) {
					if (prefetchCache.size >= PREFETCH_CACHE_MAX) {
						const oldest = prefetchCache.keys().next().value;
						if (oldest !== void 0) prefetchCache.delete(oldest);
					}
					prefetchCache.set(sessionId, {
						at: Date.now(),
						items: record.items
					});
					return {
						ok: true,
						items: record.items
					};
				}
				return {
					ok: false,
					items: [],
					error: record?.error ?? t("fetchFail")
				};
			}).catch((err) => ({
				ok: false,
				items: [],
				error: err instanceof DOMException && err.name === "AbortError" ? t("timeout") : String(err instanceof Error ? err.message : err)
			})).finally(() => {
				if (timer !== void 0) clearTimeout(timer);
			});
		}
		/** ------------------------------------------------------------------ view */
		/** The dock component: full-history listing + jump + copy. */
		function HistoryDock(props) {
			const session = props.session;
			const sessionId = session?.sessionId;
			const loadOlderFor = props.loadOlderFor;
			const timeout = props.timeout;
			const useInput = props.useInput;
			const inputActions = props.inputActions;
			const useChat = props.useChat;
			const [open, setOpen] = (0, react.useState)(false);
			const [query, setQuery] = (0, react.useState)("");
			const [notice, setNotice] = (0, react.useState)(null);
			const [desc, setDesc] = (0, react.useState)(true);
			const [hostItems, setHostItems] = (0, react.useState)(null);
			const [hostState, setHostState] = (0, react.useState)("idle");
			const [hostError, setHostError] = (0, react.useState)(null);
			const [pendingSeq, setPendingSeq] = (0, react.useState)(null);
			const [pendingRetry, setPendingRetry] = (0, react.useState)(0);
			const [copiedSeq, setCopiedSeq] = (0, react.useState)(null);
			const [loadFailed, setLoadFailed] = (0, react.useState)(false);
			const [retryToken, setRetryToken] = (0, react.useState)(0);
			const [autoLoadPages, setAutoLoadPages] = (0, react.useState)(0);
			const [recallCursor, setRecallCursor] = (0, react.useState)(-1);
			const [recallStaging, setRecallStaging] = (0, react.useState)("");
			const chatSnapshot = useChat !== void 0 ? useChat((s) => s) : void 0;
			const local = (0, react.useMemo)(() => collectWindowItems(chatSnapshot), [chatSnapshot]);
			const applyHistory = (res) => {
				if (res.ok) {
					setHostItems(res.items);
					setHostState("loaded");
				} else {
					setHostState("error");
					setHostError(res.error ?? t("fetchFail"));
				}
			};
			const resetLocate = () => {
				setPendingSeq(null);
				setPendingRetry(0);
				setLoadFailed(false);
				setAutoLoadPages(0);
			};
			(0, react.useEffect)(() => {
				if (sessionId === void 0) return;
				let cancelled = false;
				if (!prefetchCache.has(String(sessionId))) fetchFullHistory(String(sessionId)).then((res) => {
					if (cancelled) return;
					if (res.ok) applyHistory(res);
					else if (hostState !== "loaded") applyHistory(res);
				});
				return () => {
					cancelled = true;
				};
			}, [sessionId, retryToken]);
			(0, react.useEffect)(() => {
				if (!open) return;
				let cancelled = false;
				setNotice(null);
				resetLocate();
				const sid = String(sessionId);
				const cached = prefetchCache.get(sid);
				if (cached !== void 0) {
					setHostItems(cached.items);
					setHostState("loaded");
					if (Date.now() - cached.at < PREFETCH_TTL) return;
					fetchFullHistory(sid).then((res) => {
						if (!cancelled) applyHistory(res);
					});
					return;
				}
				setHostState("loading");
				setHostError(null);
				fetchFullHistory(sid).then((res) => {
					if (!cancelled) applyHistory(res);
				});
				return () => {
					cancelled = true;
				};
			}, [
				open,
				sessionId,
				retryToken
			]);
			const items = (0, react.useMemo)(() => {
				const out = (hostState === "loaded" && Array.isArray(hostItems) ? hostItems.map((it) => ({
					seq: it.seq,
					time: it.time,
					text: it.text || "",
					key: local.keys.get(it.seq) ?? null
				})) : local.items).slice();
				if (desc) out.sort((a, b) => b.seq - a.seq);
				else out.sort((a, b) => a.seq - b.seq);
				return out;
			}, [
				hostState,
				hostItems,
				local,
				desc
			]);
			const filtered = (0, react.useMemo)(() => {
				const q = query.trim().toLowerCase();
				if (!q) return items;
				return items.filter((it) => it.text.toLowerCase().indexOf(q) !== -1);
			}, [items, query]);
			const recallEntries = (0, react.useMemo)(() => {
				const list = [];
				for (const it of items) {
					const t = it.text.trim();
					if (t === "") continue;
					if (list[list.length - 1] === t) continue;
					list.push(t);
				}
				return list;
			}, [items]);
			const inputSnapshot = useInput !== void 0 ? useInput((s) => s) : void 0;
			const inputRef = (0, react.useRef)(void 0);
			inputRef.current = inputSnapshot;
			const cursorRef = (0, react.useRef)(recallCursor);
			cursorRef.current = recallCursor;
			const stagingRef = (0, react.useRef)(recallStaging);
			stagingRef.current = recallStaging;
			const entriesRef = (0, react.useRef)(recallEntries);
			entriesRef.current = recallEntries;
			(0, react.useEffect)(() => {
				if (inputActions === void 0) return;
				if (recallEntries.length === 0) return;
				let cancelled = false;
				const onKeyDown = (event) => {
					if (cancelled) return;
					if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
					if (event.isComposing || event.keyCode === 229) return;
					if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
					const target = event.target;
					if (!(target instanceof HTMLElement)) return;
					if (target.closest("[data-composer-card]") === null) return;
					const live = inputRef.current;
					if (live === void 0) return;
					if (live.claim !== void 0) return;
					if (live.phase === "adjudicating" || live.phase === "submitting") return;
					const entries = entriesRef.current;
					let cursor = cursorRef.current;
					let next = null;
					if (event.key === "ArrowUp") {
						if (cursor === -1) {
							stagingRef.current = live.draft;
							setRecallStaging(live.draft);
							cursor = entries.length - 1;
							next = entries[cursor];
						} else if (cursor > 0) {
							cursor -= 1;
							next = entries[cursor];
						} else return;
					} else {
						if (cursor === -1) return;
						if (cursor < entries.length - 1) {
							cursor += 1;
							next = entries[cursor];
						} else {
							cursor = -1;
							next = stagingRef.current;
						}
					}
					cursorRef.current = cursor;
					setRecallCursor(cursor);
					event.preventDefault();
					event.stopPropagation();
					inputActions.setDraft(next === null ? "" : next);
				};
				document.addEventListener("keydown", onKeyDown, true);
				return () => {
					cancelled = true;
					document.removeEventListener("keydown", onKeyDown, true);
				};
			}, [inputActions, recallEntries.length]);
			const draft = inputSnapshot?.draft ?? "";
			(0, react.useEffect)(() => {
				if (recallCursor >= 0 && recallEntries[recallCursor] !== void 0 && draft !== recallEntries[recallCursor]) {
					setRecallCursor(-1);
					setRecallStaging(draft);
				}
			}, [
				draft,
				recallCursor,
				recallEntries
			]);
			(0, react.useEffect)(() => {
				if (pendingSeq === null) return;
				if (!session) return;
				const key = local.keys.get(pendingSeq);
				if (key !== void 0) {
					if (findAnchor(key) !== null) {
						if (scrollToKey(key)) {
							setOpen(false);
							setQuery("");
							setNotice(null);
						} else setNotice(t("scrollMiss"));
						resetLocate();
						return;
					}
					if (pendingRetry >= MAX_LOCATE_RETRIES) {
						resetLocate();
						setNotice(t("rendering"));
						return;
					}
					setNotice(t("locating"));
					if (typeof timeout === "function") timeout(() => setPendingRetry((n) => n + 1), 150);
					else setPendingRetry((n) => n + 1);
					return;
				}
				if (loadFailed) return;
				if (autoLoadPages >= MAX_AUTO_LOAD_PAGES) {
					setLoadFailed(true);
					setNotice(t("autoLoadGiveUp", { pages: MAX_AUTO_LOAD_PAGES }));
					return;
				}
				if (session.hasMore && !session.loadingOlder) try {
					const p = loadOlderFor?.(String(sessionId));
					if (p && typeof p.then === "function") {
						setAutoLoadPages((n) => n + 1);
						setNotice(t("loadingEarlier"));
						p.then(() => setPendingRetry((n) => n + 1)).catch(() => {
							setLoadFailed(true);
							setNotice(t("loadEarlierFail"));
						});
					}
				} catch {
					setLoadFailed(true);
					setNotice(t("loadEarlierFail"));
				}
				else if (!session.hasMore) {
					setLoadFailed(true);
					setNotice(t("earliestNotFound"));
				}
			}, [
				pendingSeq,
				local.keys,
				loadFailed,
				session,
				sessionId,
				loadOlderFor,
				autoLoadPages,
				pendingRetry,
				timeout
			]);
			const jumpTo = (it) => {
				if (pendingSeq === it.seq) return;
				if (it.key) {
					if (findAnchor(it.key) !== null && scrollToKey(it.key)) {
						setOpen(false);
						setQuery("");
						setNotice(null);
						return;
					}
					setNotice(t("locating"));
					setPendingSeq(it.seq);
					setPendingRetry(0);
					setLoadFailed(false);
					setAutoLoadPages(0);
					return;
				}
				if (typeof loadOlderFor !== "function") {
					setNotice(t("noAutoLoad"));
					return;
				}
				setNotice(t("loadingEarlier"));
				setPendingSeq(it.seq);
				setPendingRetry(0);
				setLoadFailed(false);
				setAutoLoadPages(0);
			};
			const doCopy = (it, e) => {
				e.stopPropagation();
				copyText(it.text).then((ok) => {
					if (ok) {
						setCopiedSeq(it.seq);
						if (typeof timeout === "function") timeout(() => setCopiedSeq((cur) => cur === it.seq ? null : cur), 1400);
					} else setNotice(t("copyFail"));
				});
			};
			(0, react.useEffect)(() => {
				if (!open) return;
				const onKey = (e) => {
					if (e.key === "Escape") setOpen(false);
				};
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("keydown", onKey);
				};
			}, [open]);
			const children = [];
			if (recallCursor >= 0 && recallEntries.length > 0) children.push((0, react.createElement)("div", {
				key: "recall",
				className: "dshm_recall",
				"aria-live": "polite"
			}, [(0, react.createElement)("span", {
				key: "glyph",
				className: "dshm_recallGlyph"
			}, "↑↓"), (0, react.createElement)("span", { key: "pos" }, `history ${recallCursor + 1}/${recallEntries.length}`)]));
			children.push((0, react.createElement)("button", {
				key: "trigger",
				type: "button",
				className: "dshm_trigger",
				onClick: () => {
					setOpen(!open);
					setQuery("");
					setNotice(null);
					setPendingSeq(null);
				},
				"aria-expanded": open,
				"aria-label": t("badgeAria")
			}, [(0, react.createElement)("span", {
				key: "badge",
				className: "dshm_badge"
			}, t("badge", { count: items.length })), (0, react.createElement)("span", {
				key: "chev",
				className: "dshm_chevron"
			}, open ? "▾" : "▸")]));
			if (open) {
				const panel = [];
				panel.push((0, react.createElement)("div", {
					key: "tools",
					className: "dshm_toolrow"
				}, [(0, react.createElement)("input", {
					key: "search",
					className: "dshm_search",
					type: "text",
					placeholder: t("searchPlaceholder"),
					value: query,
					onChange: (e) => setQuery(e.target.value),
					autoFocus: true
				}), (0, react.createElement)("button", {
					key: "order",
					type: "button",
					className: "dshm_order",
					onClick: () => setDesc(!desc)
				}, desc ? t("newestFirst") : t("oldestFirst"))]));
				if (notice) panel.push((0, react.createElement)("div", {
					key: "notice",
					className: "dshm_notice"
				}, notice));
				if (hostState === "loading") panel.push((0, react.createElement)("div", {
					key: "loading",
					className: "dshm_loading"
				}, t("loading")));
				else if (hostState === "error") panel.push((0, react.createElement)("div", {
					key: "error",
					className: "dshm_error"
				}, [t("loadErrorPrefix", { error: hostError ?? t("unknownError") }), (0, react.createElement)("button", {
					key: "retry",
					type: "button",
					className: "dshm_retry",
					onClick: () => setRetryToken((n) => n + 1)
				}, t("retry"))]));
				if (filtered.length > 0) {
					const rows = filtered.slice(0, MAX_RENDERED_ROWS).map((it) => {
						const pending = pendingSeq === it.seq;
						const copied = copiedSeq === it.seq;
						const tagClass = pending ? "dshm_tagPending" : it.key ? "dshm_tagLoaded" : "dshm_tag";
						const tagText = pending ? t("tagPending") : it.key ? t("tagJumpable") : t("tagNotLoaded");
						return (0, react.createElement)("li", {
							key: `m${it.seq}`,
							className: "dshm_row",
							title: it.text || t("noText")
						}, [
							(0, react.createElement)("span", {
								key: "t",
								className: "dshm_time"
							}, fmtTime(it.time)),
							(0, react.createElement)("span", {
								key: "x",
								className: "dshm_text",
								role: "button",
								tabIndex: 0,
								"aria-label": t("jumpAria", { text: it.text || t("noText") }),
								onClick: () => jumpTo(it),
								onKeyDown: (e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										jumpTo(it);
									}
								}
							}, it.text || t("noText")),
							(0, react.createElement)("span", {
								key: "tag",
								className: tagClass,
								onClick: () => jumpTo(it)
							}, tagText),
							(0, react.createElement)("button", {
								key: "c",
								type: "button",
								className: "dshm_copy",
								title: copied ? t("copied") : t("copyText"),
								"aria-label": copied ? t("copied") : t("copyAria"),
								onClick: (e) => doCopy(it, e)
							}, copied ? "✓" : "⧉")
						]);
					});
					panel.push((0, react.createElement)("ul", {
						key: "list",
						className: "dshm_list"
					}, rows));
					if (filtered.length > MAX_RENDERED_ROWS) panel.push((0, react.createElement)("div", {
						key: "cap",
						className: "dshm_notice"
					}, t("capNotice", {
						shown: MAX_RENDERED_ROWS,
						total: filtered.length
					})));
				} else if (hostState !== "loading") panel.push((0, react.createElement)("div", {
					key: "empty",
					className: "dshm_empty"
				}, query.trim() ? t("emptyFiltered") : t("emptySession")));
				if (hostState === "loaded" && Array.isArray(hostItems) && hostItems.length > items.length) panel.push((0, react.createElement)("div", {
					key: "more",
					className: "dshm_notice"
				}, t("moreNotice", {
					total: hostItems.length,
					beyond: hostItems.length - local.items.length
				})));
				children.push((0, react.createElement)("div", {
					key: "panel",
					className: "dshm_panel"
				}, panel));
			}
			return (0, react.createElement)("div", { className: "dshm_root" }, children);
		}
		/** ------------------------------------------------------------------ plugin */
		/** Services required before mounting: the slot registry. */
		const inject = ["slots"];
		/** Test seam: language table access for the bundle smoke test. */
		const __i18n = {
			t,
			setLang,
			syncHostLocale
		};
		/**
		* Client plugin body: inject the stylesheet and register the dock row.
		* @param ctx - client plugin context (slots, sessions, timer).
		*/
		function apply(ctx) {
			syncHostLocale(ctx);
			ctx.effect(() => injectStyles(), "dsh-history: stylesheet");
			const slots = ctx.get("slots");
			if (slots === void 0) return;
			const sessions = ctx.get("sessions");
			const timer = ctx.get("timer");
			const timeout = timer?.timeout.bind(timer);
			const loadOlderFor = sessions === void 0 ? void 0 : (id) => {
				const b = sessions.binding(id);
				if (b === void 0 || !b.session || typeof b.session.loadOlder !== "function") return Promise.resolve();
				return b.session.loadOlder();
			};
			slots.inject("conversation.input.dock", () => slots.register({
				name: "conversation.input.dock",
				id: "dsh-history",
				order: 30
			}, (props) => (0, react.createElement)(HistoryDock, {
				session: props.session,
				loadOlderFor,
				timeout,
				useInput: props.useInput,
				inputActions: props.inputActions,
				useChat: props.useChat
			})));
		}
		//#endregion
		exports.__i18n = __i18n;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client-registry.js.map