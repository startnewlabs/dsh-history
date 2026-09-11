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
import { createElement, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import type { Context } from 'cordis'
import {
  type HistoryChatSnapshot,
  type HistoryRow,
  type HistorySessionSnapshot,
  collectWindowItems,
  copyText,
  findAnchor,
  fmtTime,
  scrollToKey,
} from './util'

/** ------------------------------------------------------------------ types */

/** The client slots service face (structural subset used here). */
interface HistorySlotsService {
  inject(key: string, callback: () => () => void): () => void
  register(options: {
    name: string
    id?: string
    order?: number
  }, component: (props: HistoryDockProps) => ReactElement): () => void
}

/** The client sessions service face (structural subset used here). */
interface ClientSessionsService {
  binding(id: string): {
    session: { loadOlder(): Promise<void> }
  } | undefined
}

/** One full-history row from the host route. */
interface HistoryHostItem {
  seq: number
  time: number
  text: string
}

/** Props the dock slot renders with. */
interface HistoryDockProps {
  session?: HistorySessionSnapshot
  /** Standard kit: the composer input state hook (per-session). */
  useInput?: <T>(selector: (s: InputState) => T) => T
  /** Standard kit: the composer input action face. */
  inputActions?: InputActions
  /** Standard kit: selector hook over the current Chat target snapshot (DSH 0.1.5+). */
  useChat?: <T>(selector: (s: HistoryChatSnapshot) => T) => T
}

/** The composer input state slice this plugin reads (structural subset). */
interface InputState {
  readonly draft: string
  readonly phase: 'plain' | 'adjudicating' | 'claimed' | 'submitting'
  /** Present exactly while claimed/submitting (a '/' or '@' trigger menu). */
  readonly claim?: unknown
}

/** The composer input action face (structural subset). */
interface InputActions {
  setDraft(text: string): void
}

/** Timer service face (optional; used to auto-clear the copy feedback). */
interface HistoryTimer {
  timeout(callback: () => void, delay: number): () => void
}

declare module 'cordis' {
  interface Context {
    slots: HistorySlotsService
    sessions?: ClientSessionsService
    timer?: HistoryTimer
  }
}

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
`

/** Inject the plugin stylesheet once per activation (removed on disposal). */
function injectStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (document.querySelector('style[data-plugin-css="dsh-history/styles"]') !== null) return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-history'
  tag.dataset.pluginCss = 'dsh-history/styles'
  tag.textContent = CSS
  document.head.appendChild(tag)
  return () => {
    if (tag.parentNode !== null) tag.parentNode.removeChild(tag)
  }
}

/** ------------------------------------------------------------------ data */

/**
 * module-level prefetch cache: sessionId → full-history items. The dock
 * prefetches on mount (every session renders its own dock), so opening the
 * panel reads this cache and renders instantly. Bounded to avoid leaks.
 */
const prefetchCache = new Map<string, { at: number; items: HistoryHostItem[] }>()

const PREFETCH_TTL = 10000
const FETCH_TIMEOUT = 15000
const PREFETCH_CACHE_MAX = 20
const MAX_AUTO_LOAD_PAGES = 30
const MAX_LOCATE_RETRIES = 10
const MAX_RENDERED_ROWS = 200

/** Fetch the full history for a session (network + re-cache, with timeout). */
function fetchFullHistory(sessionId: string): Promise<{ ok: boolean; items: HistoryHostItem[]; error?: string }> {
  const controller = typeof AbortController === 'undefined' ? undefined : new AbortController()
  const timer = controller !== undefined && typeof setTimeout === 'function'
    ? setTimeout(() => { controller.abort() }, FETCH_TIMEOUT)
    : undefined
  return fetch(`/history/api/list-user-messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId }),
    signal: controller?.signal,
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((data: unknown) => {
      const record = data as { ok?: boolean; items?: HistoryHostItem[]; error?: string }
      if (record && record.ok === true && Array.isArray(record.items)) {
        if (prefetchCache.size >= PREFETCH_CACHE_MAX) {
          const oldest = prefetchCache.keys().next().value
          if (oldest !== undefined) prefetchCache.delete(oldest)
        }
        prefetchCache.set(sessionId, { at: Date.now(), items: record.items })
        return { ok: true, items: record.items }
      }
      return { ok: false, items: [], error: record?.error ?? '读取完整历史失败' }
    })
    .catch((err: unknown) => ({
      ok: false,
      items: [],
      error: err instanceof DOMException && err.name === 'AbortError' ? '请求超时' : String(err instanceof Error ? err.message : err),
    }))
    .finally(() => {
      if (timer !== undefined) clearTimeout(timer)
    })
}

/** ------------------------------------------------------------------ view */

/** The dock component: full-history listing + jump + copy. */
function HistoryDock(props: HistoryDockProps & {
  loadOlderFor?: (id: string) => Promise<void>
  timeout?: HistoryTimer['timeout']
}): ReactElement {
  const session = props.session
  const sessionId = session?.sessionId
  const loadOlderFor = props.loadOlderFor
  const timeout = props.timeout
  const useInput = props.useInput
  const inputActions = props.inputActions
  const useChat = props.useChat
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [desc, setDesc] = useState(true)
  const [hostItems, setHostItems] = useState<HistoryHostItem[] | null>(null)
  const [hostState, setHostState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [hostError, setHostError] = useState<string | null>(null)
  const [pendingSeq, setPendingSeq] = useState<number | null>(null)
  const [pendingRetry, setPendingRetry] = useState(0)
  const [copiedSeq, setCopiedSeq] = useState<number | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retryToken, setRetryToken] = useState(0)
  const [autoLoadPages, setAutoLoadPages] = useState(0)
  // ↑/↓ recall: cursor -1 = live draft; >=0 = browsing history entries.
  const [recallCursor, setRecallCursor] = useState(-1)
  const [recallStaging, setRecallStaging] = useState('')

  // The rendered Chat nodes live on the separate Chat target snapshot in DSH
  // 0.1.5+; read them through the injected `useChat` selector hook. Called
  // unconditionally (hook order) and read only when the standard prop exists.
  const chatSnapshot = useChat !== undefined ? useChat((s) => s) : undefined
  const local = useMemo(() => collectWindowItems(chatSnapshot), [chatSnapshot])

  const applyHistory = (res: { ok: boolean; items: HistoryHostItem[]; error?: string }): void => {
    if (res.ok) { setHostItems(res.items); setHostState('loaded') }
    else { setHostState('error'); setHostError(res.error ?? '读取完整历史失败') }
  }
  const resetLocate = (): void => {
    setPendingSeq(null); setPendingRetry(0); setLoadFailed(false); setAutoLoadPages(0)
  }

  // Prefetch the full history on mount, so opening the panel renders instantly.
  useEffect(() => {
    if (sessionId === undefined) return
    let cancelled = false
    if (!prefetchCache.has(String(sessionId))) {
      fetchFullHistory(String(sessionId)).then((res) => {
        if (cancelled) return
        if (res.ok) applyHistory(res)
        else if (hostState !== 'loaded') applyHistory(res)
      })
    }
    return () => { cancelled = true }
  }, [sessionId, retryToken])

  // On open, seed from the cache immediately; re-fetch only if stale/absent.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setNotice(null); resetLocate()
    const sid = String(sessionId)
    const cached = prefetchCache.get(sid)
    if (cached !== undefined) {
      setHostItems(cached.items); setHostState('loaded')
      if (Date.now() - cached.at < PREFETCH_TTL) return
      fetchFullHistory(sid).then((res) => { if (!cancelled) applyHistory(res) })
      return
    }
    setHostState('loading'); setHostError(null)
    fetchFullHistory(sid).then((res) => { if (!cancelled) applyHistory(res) })
    return () => { cancelled = true }
  }, [open, sessionId, retryToken])

  // Merge host full list with the local-window seq→key map; apply sort.
  const items = useMemo<HistoryRow[]>(() => {
    const base = hostState === 'loaded' && Array.isArray(hostItems)
      ? hostItems.map((it) => ({
        seq: it.seq, time: it.time, text: it.text || '', key: local.keys.get(it.seq) ?? null,
      }))
      : local.items
    const out = base.slice()
    if (desc) out.sort((a, b) => b.seq - a.seq)
    else out.sort((a, b) => a.seq - b.seq)
    return out
  }, [hostState, hostItems, local, desc])

  const filtered = useMemo<HistoryRow[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => it.text.toLowerCase().indexOf(q) !== -1)
  }, [items, query])

  // ↑/↓ recall: with the composer focused and no trigger menu / IME / busy
  // state, ↑ steps back through the messages you sent (oldest→newest from the
  // most recent), ↓ steps forward, and the recalled line lands in the draft
  // for editing + Enter to re-send. Uses the same full-history `items` (which
  // includes not-yet-loaded pages), so recall reaches further than the loaded
  // window. Falls back to native behavior otherwise.
  const recallEntries = useMemo<string[]>(() => {
    const list: string[] = []
    for (const it of items) {
      const t = it.text.trim()
      if (t === '') continue
      if (list[list.length - 1] === t) continue // collapse consecutive dupes
      list.push(t)
    }
    return list
  }, [items])

  // useInput is a stable hook from the standard kit; call it unconditionally
  // (the hook-order rule) and only read its value when it exists.
  const inputSnapshot = useInput !== undefined
    ? useInput((s: InputState) => s)
    : undefined

  // Keep the latest input facts in a ref so the long-lived keydown listener
  // never needs re-binding on every keystroke.
  const inputRef = useRef<InputState | undefined>(undefined)
  inputRef.current = inputSnapshot
  const cursorRef = useRef(recallCursor)
  cursorRef.current = recallCursor
  const stagingRef = useRef(recallStaging)
  stagingRef.current = recallStaging
  const entriesRef = useRef(recallEntries)
  entriesRef.current = recallEntries

  useEffect(() => {
    if (inputActions === undefined) return
    if (recallEntries.length === 0) return
    let cancelled = false
    const onKeyDown = (event: KeyboardEvent): void => {
      if (cancelled) return
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      // IME composition (Chinese input) keeps its own arrows.
      if (event.isComposing || event.keyCode === 229) return
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.closest('[data-composer-card]') === null) return
      const live = inputRef.current
      if (live === undefined) return
      // A '/' or '@' trigger menu is open, or the composer is busy: leave arrows.
      if (live.claim !== undefined) return
      if (live.phase === 'adjudicating' || live.phase === 'submitting') return

      const entries = entriesRef.current
      let cursor = cursorRef.current
      let next: string | null = null
      if (event.key === 'ArrowUp') {
        if (cursor === -1) {
          stagingRef.current = live.draft
          setRecallStaging(live.draft)
          cursor = entries.length - 1
          next = entries[cursor]
        } else if (cursor > 0) {
          cursor -= 1
          next = entries[cursor]
        } else {
          return // oldest entry — native behavior
        }
      } else {
        if (cursor === -1) return // live draft — native behavior
        if (cursor < entries.length - 1) {
          cursor += 1
          next = entries[cursor]
        } else {
          cursor = -1
          next = stagingRef.current
        }
      }
      cursorRef.current = cursor
      setRecallCursor(cursor)
      event.preventDefault()
      event.stopPropagation()
      inputActions.setDraft(next === null ? '' : next)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      cancelled = true
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [inputActions, recallEntries.length])

  // Typing after a recall returns to the live position (edited text becomes
  // the new staging draft).
  const draft = inputSnapshot?.draft ?? ''
  useEffect(() => {
    if (recallCursor >= 0 && recallEntries[recallCursor] !== undefined && draft !== recallEntries[recallCursor]) {
      setRecallCursor(-1)
      setRecallStaging(draft)
    }
  }, [draft, recallCursor, recallEntries])

  // Auto-locate a target: page-load earlier history until the node lands in the
  // loaded window, then wait for its DOM row to render, then scroll + close.
  useEffect(() => {
    if (pendingSeq === null) return
    if (!session) return
    const key = local.keys.get(pendingSeq)
    if (key !== undefined) {
      if (findAnchor(key) !== null) {
        if (scrollToKey(key)) {
          setOpen(false); setQuery(''); setNotice(null)
        } else {
          setNotice('已定位到该消息，但页面滚动未生效，请再点击一次。')
        }
        resetLocate()
        return
      }
      if (pendingRetry >= MAX_LOCATE_RETRIES) {
        resetLocate()
        setNotice('该消息正在渲染中，暂时无法定位。请稍候再试。')
        return
      }
      setNotice('正在定位该消息…')
      if (typeof timeout === 'function') timeout(() => setPendingRetry((n) => n + 1), 150)
      else setPendingRetry((n) => n + 1)
      return
    }
    if (loadFailed) return
    if (autoLoadPages >= MAX_AUTO_LOAD_PAGES) {
      setLoadFailed(true)
      setNotice(`连续加载 ${MAX_AUTO_LOAD_PAGES} 页仍未找到该消息，已停止。可尝试向上滚动加载更早内容后重试。`)
      return
    }
    if (session.hasMore && !session.loadingOlder) {
      try {
        const p = loadOlderFor?.(String(sessionId))
        if (p && typeof p.then === 'function') {
          setAutoLoadPages((n) => n + 1)
          setNotice('正在加载更早历史以定位该消息…')
          p.then(() => setPendingRetry((n) => n + 1)).catch(() => {
            setLoadFailed(true); setNotice('加载更早历史失败，无法定位该消息。')
          })
        }
      } catch {
        setLoadFailed(true); setNotice('加载更早历史失败，无法定位该消息。')
      }
    } else if (!session.hasMore) {
      setLoadFailed(true)
      setNotice('已加载到该会话最早的记录，仍未找到这条消息（可能已被删除）。')
    }
  }, [pendingSeq, local.keys, loadFailed, session, sessionId, loadOlderFor, autoLoadPages, pendingRetry, timeout])

  const jumpTo = (it: HistoryRow): void => {
    if (pendingSeq === it.seq) return
    if (it.key) {
      if (findAnchor(it.key) !== null && scrollToKey(it.key)) {
        setOpen(false); setQuery(''); setNotice(null)
        return
      }
      setNotice('正在定位该消息…')
      setPendingSeq(it.seq); setPendingRetry(0); setLoadFailed(false); setAutoLoadPages(0)
      return
    }
    if (typeof loadOlderFor !== 'function') {
      setNotice('这条消息位于更早的历史中，尚未加载到当前对话窗口。当前环境无法自动加载更早历史，可先向上滚动加载。')
      return
    }
    setNotice('正在加载更早历史以定位该消息…')
    setPendingSeq(it.seq); setPendingRetry(0); setLoadFailed(false); setAutoLoadPages(0)
  }

  const doCopy = (it: HistoryRow, e: { stopPropagation(): void }): void => {
    e.stopPropagation()
    copyText(it.text).then((ok) => {
      if (ok) {
        setCopiedSeq(it.seq)
        if (typeof timeout === 'function') {
          timeout(() => setCopiedSeq((cur) => (cur === it.seq ? null : cur)), 1400)
        }
      } else {
        setNotice('复制失败。')
      }
    })
  }

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey) }
  }, [open])

  const children: ReactElement[] = []
  if (recallCursor >= 0 && recallEntries.length > 0) {
    children.push(createElement('div', {
      key: 'recall',
      className: 'dshm_recall',
      'aria-live': 'polite',
    }, [
      createElement('span', { key: 'glyph', className: 'dshm_recallGlyph' }, '↑↓'),
      createElement('span', { key: 'pos' }, `history ${recallCursor + 1}/${recallEntries.length}`),
    ]))
  }
  children.push(createElement('button', {
    key: 'trigger',
    type: 'button',
    className: 'dshm_trigger',
    onClick: () => { setOpen(!open); setQuery(''); setNotice(null); setPendingSeq(null) },
    'aria-expanded': open,
    'aria-label': '我的消息',
  }, [
    createElement('span', { key: 'badge', className: 'dshm_badge' }, `我的消息 (${items.length})`),
    createElement('span', { key: 'chev', className: 'dshm_chevron' }, open ? '▾' : '▸'),
  ]))

  if (open) {
    const panel: ReactElement[] = []
    panel.push(createElement('div', { key: 'tools', className: 'dshm_toolrow' }, [
      createElement('input', {
        key: 'search',
        className: 'dshm_search',
        type: 'text',
        placeholder: '搜索我发过的消息…',
        value: query,
        onChange: (e: { target: { value: string } }) => setQuery(e.target.value),
        autoFocus: true,
      }),
      createElement('button', {
        key: 'order',
        type: 'button',
        className: 'dshm_order',
        onClick: () => setDesc(!desc),
      }, desc ? '最新在前' : '最早在前'),
    ]))
    if (notice) {
      panel.push(createElement('div', { key: 'notice', className: 'dshm_notice' }, notice))
    }
    if (hostState === 'loading') {
      panel.push(createElement('div', { key: 'loading', className: 'dshm_loading' }, '正在读取完整历史…'))
    } else if (hostState === 'error') {
      panel.push(createElement('div', { key: 'error', className: 'dshm_error' }, [
        `完整历史读取失败：${hostError ?? '未知错误'}（当前仅显示已加载窗口内的消息）`,
        createElement('button', {
          key: 'retry',
          type: 'button',
          className: 'dshm_retry',
          onClick: () => setRetryToken((n) => n + 1),
        }, '重试'),
      ]))
    }
    if (filtered.length > 0) {
      const trimmed = filtered.slice(0, MAX_RENDERED_ROWS)
      const rows = trimmed.map((it) => {
        const pending = pendingSeq === it.seq
        const copied = copiedSeq === it.seq
        const tagClass = pending ? 'dshm_tagPending' : (it.key ? 'dshm_tagLoaded' : 'dshm_tag')
        const tagText = pending ? '定位中…' : (it.key ? '可定位' : '未加载')
        return createElement('li', {
          key: `m${it.seq}`,
          className: 'dshm_row',
          title: it.text || '(无文本)',
        }, [
          createElement('span', { key: 't', className: 'dshm_time' }, fmtTime(it.time)),
          createElement('span', {
            key: 'x',
            className: 'dshm_text',
            role: 'button',
            tabIndex: 0,
            'aria-label': `跳转到：${it.text || '(无文本)'}`,
            onClick: () => jumpTo(it),
            onKeyDown: (e: { key: string; preventDefault(): void }) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpTo(it) }
            },
          }, it.text || '(无文本)'),
          createElement('span', { key: 'tag', className: tagClass, onClick: () => jumpTo(it) }, tagText),
          createElement('button', {
            key: 'c',
            type: 'button',
            className: 'dshm_copy',
            title: copied ? '已复制' : '复制文本',
            'aria-label': copied ? '已复制' : '复制消息文本',
            onClick: (e: { stopPropagation(): void }) => doCopy(it, e),
          }, copied ? '✓' : '⧉'),
        ])
      })
      panel.push(createElement('ul', { key: 'list', className: 'dshm_list' }, rows))
      if (filtered.length > MAX_RENDERED_ROWS) {
        panel.push(createElement('div', { key: 'cap', className: 'dshm_notice' }, `仅显示最近 ${MAX_RENDERED_ROWS} 条匹配消息（共 ${filtered.length} 条）；使用搜索框可缩小范围。`))
      }
    } else if (hostState !== 'loading') {
      panel.push(createElement('div', { key: 'empty', className: 'dshm_empty' }, query.trim() ? '没有匹配的消息。' : '这个会话里还没有你发起的消息。'))
    }
    if (hostState === 'loaded' && Array.isArray(hostItems) && hostItems.length > items.length) {
      panel.push(createElement('div', { key: 'more', className: 'dshm_notice' }, `已显示全部 ${hostItems.length} 条你发送的消息；${hostItems.length - local.items.length} 条位于已加载窗口之外（点击可自动加载并定位，或先向上滚动加载）。`))
    }
    children.push(createElement('div', { key: 'panel', className: 'dshm_panel' }, panel))
  }

  return createElement('div', { className: 'dshm_root' }, children)
}

/** ------------------------------------------------------------------ plugin */

/** Services required before mounting: the slot registry. */
export const inject = ['slots']

/**
 * Client plugin body: inject the stylesheet and register the dock row.
 * @param ctx - client plugin context (slots, sessions, timer).
 */
export function apply(ctx: Context): void {
  ctx.effect(() => injectStyles(), 'dsh-history: stylesheet')
  const slots = ctx.get('slots') as HistorySlotsService | undefined
  if (slots === undefined) return
  const sessions = ctx.get('sessions') as ClientSessionsService | undefined
  const timer = ctx.get('timer') as HistoryTimer | undefined
  const timeout = timer?.timeout.bind(timer)
  const loadOlderFor = sessions === undefined
    ? undefined
    : (id: string): Promise<void> => {
      const b = sessions.binding(id)
      if (b === undefined || !b.session || typeof b.session.loadOlder !== 'function') return Promise.resolve()
      return b.session.loadOlder()
    }
  slots.inject('conversation.input.dock', () => slots.register(
    { name: 'conversation.input.dock', id: 'dsh-history', order: 30 },
    (props: HistoryDockProps & { useInput?: unknown; inputActions?: unknown; useChat?: unknown }) => createElement(HistoryDock, {
      session: props.session,
      loadOlderFor,
      timeout,
      useInput: props.useInput as HistoryDockProps['useInput'],
      inputActions: props.inputActions as HistoryDockProps['inputActions'],
      useChat: props.useChat as HistoryDockProps['useChat'],
    }),
  ))
}
