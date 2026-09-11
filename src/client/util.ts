/**
 * Pure helpers for the dsh-history client half. No React, no plugin services —
 * only thin DOM/browser helpers and data transforms. Kept in one file so the
 * component (index.ts) stays focused on rendering and state, and so utility
 * logic is testable in isolation.
 */

/** One materialized chat node (user or steering message). */
export interface HistoryChatNode {
  kind?: string
  key?: string
  anchorSeq?: number
  visibility?: string
  data?: {
    seq?: number
    time?: number
    content?: readonly HistoryContentBlock[]
  }
}

/** One content block (structural subset: the text/image/tool shapes). */
export interface HistoryContentBlock {
  type?: string
  text?: string
  name?: string
}

/** One rendered list row. */
export interface HistoryRow {
  seq: number
  time: number
  text: string
  key: string | null
}

/**
 * The Session snapshot slice this plugin reads (structural subset of DSH's
 * `SessionSnapshot`). It arrives as the dock's owner share (`props.session`)
 * and carries lifecycle/history state only: since DSH 0.1.5 the rendered Chat
 * nodes live in a separate Chat-target snapshot ({@link HistoryChatSnapshot}).
 */
export interface HistorySessionSnapshot {
  sessionId?: string
  hasMore?: boolean
  loadingOlder?: boolean
}

/**
 * The Chat target snapshot slice this plugin reads (structural subset of DSH
 * 0.1.5's `ChatSnapshot`). It is reached through the `useChat` selector hook
 * that the framework injects into `conversation.input.dock` standard props;
 * the older `props.session.chat` path no longer exists.
 */
export interface HistoryChatSnapshot {
  nodes?: {
    values(): readonly HistoryChatNode[]
  }
}

/** Flatten one message's content blocks to a single preview string. */
export function textOf(content: readonly HistoryContentBlock[] | undefined): string {
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const b of content) {
    if (b && b.type === 'text' && typeof b.text === 'string') parts.push(b.text)
    else if (b && b.type === 'image') parts.push('[图片]')
    else if (b && b.type === 'tool-call' && typeof b.name === 'string') parts.push('[工具: ' + b.name + ']')
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/** Format a Unix epoch ms timestamp: same-day → HH:mm; else YYYY-MM-DD HH:mm. */
export function fmtTime(ms: number): string {
  if (!ms || typeof ms !== 'number') return ''
  try {
    const d = new Date(ms)
    const now = new Date()
    const pad = (n: number): string => String(n).padStart(2, '0')
    const sameDay = d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate()
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    if (sameDay) return time
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
  } catch {
    return ''
  }
}

/** Collect the user/steering messages in the loaded window + seq→key map. */
export function collectWindowItems(chat: HistoryChatSnapshot | undefined): {
  items: HistoryRow[]
  keys: Map<number, string>
} {
  const items: HistoryRow[] = []
  const keys = new Map<number, string>()
  if (!chat || !chat.nodes) return { items, keys }
  let nodes: readonly HistoryChatNode[] = []
  try {
    nodes = chat.nodes.values()
  } catch {
    nodes = []
  }
  for (const node of nodes) {
    if (!node) continue
    if (node.kind !== 'user' && node.kind !== 'steering') continue
    if (node.visibility === 'hidden') continue
    const data = node.data || {}
    const seq = typeof node.anchorSeq === 'number' ? node.anchorSeq : (typeof data.seq === 'number' ? data.seq : 0)
    if (typeof node.key === 'string' && node.key) keys.set(seq, node.key)
    items.push({
      seq,
      time: typeof data.time === 'number' ? data.time : 0,
      text: textOf(data.content),
      key: typeof node.key === 'string' ? node.key : null,
    })
  }
  items.sort((a, b) => a.seq - b.seq)
  return { items, keys }
}

/** Find the conversation row DOM element for a chat-node anchor key. */
export function findAnchor(key: string): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const rows = document.querySelectorAll<HTMLElement>('[data-chat-anchor-key]')
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row && row.dataset && row.dataset.chatAnchorKey === key) return row
  }
  return null
}

/** Scroll a message row into view (centered) and flash-highlight it.
 *  Positions the conversation scrollport directly (synchronous, reliable),
 *  rather than relying on async scrollIntoView which can silently no-op. */
export function scrollToKey(key: string): boolean {
  const el = findAnchor(key)
  if (!el) return false
  try {
    el.classList.remove('dshm-flash')
    void el.offsetWidth
    el.classList.add('dshm-flash')
    el.addEventListener('animationend', () => el.classList.remove('dshm-flash'), { once: true })

    let port: HTMLElement | null = null
    let node: HTMLElement | null = el.parentElement
    while (node !== null) {
      const overflow = getComputedStyle(node).overflowY
      if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') {
        port = node
        break
      }
      node = node.parentElement
    }
    if (port !== null) {
      const elRect = el.getBoundingClientRect()
      const portRect = port.getBoundingClientRect()
      const target = port.scrollTop + elRect.top - portRect.top - portRect.height / 2 + elRect.height / 2
      if (Math.abs(target - port.scrollTop) > 1) port.scrollTop = target
      return true
    }
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch {
      return false
    }
    return true
  } catch {
    return false
  }
}

/** Copy text to the clipboard (Clipboard API first, execCommand fallback). */
export function copyText(text: string): Promise<boolean> {
  if (!text) return Promise.resolve(false)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text))
  }
  return Promise.resolve(fallbackCopy(text))
}

function fallbackCopy(text: string): boolean {
  if (typeof document === 'undefined') return false
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
