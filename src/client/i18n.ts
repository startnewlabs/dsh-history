/**
 * Minimal zh/en string table for the client UI.
 *
 * English is the default; Chinese is used only when the host locale service
 * (or, failing that, the browser language) reports a zh locale. The host's
 * locale snapshot has the shape { active, locales, revision } — `active` is
 * the resolved locale id.
 */

type Lang = 'zh' | 'en'

const zh = {
  fetchFail: '读取完整历史失败',
  timeout: '请求超时',
  scrollMiss: '已定位到该消息，但页面滚动未生效，请再点击一次。',
  rendering: '该消息正在渲染中，暂时无法定位。请稍候再试。',
  locating: '正在定位该消息…',
  autoLoadGiveUp: '连续加载 {pages} 页仍未找到该消息，已停止。可尝试向上滚动加载更早内容后重试。',
  loadingEarlier: '正在加载更早历史以定位该消息…',
  loadEarlierFail: '加载更早历史失败，无法定位该消息。',
  earliestNotFound: '已加载到该会话最早的记录，仍未找到这条消息（可能已被删除）。',
  noAutoLoad: '这条消息位于更早的历史中，尚未加载到当前对话窗口。当前环境无法自动加载更早历史，可先向上滚动加载。',
  copyFail: '复制失败。',
  badgeAria: '我的消息',
  badge: '我的消息 ({count})',
  searchPlaceholder: '搜索我发过的消息…',
  newestFirst: '最新在前',
  oldestFirst: '最早在前',
  loading: '正在读取完整历史…',
  loadErrorPrefix: '完整历史读取失败：{error}（当前仅显示已加载窗口内的消息）',
  unknownError: '未知错误',
  retry: '重试',
  tagPending: '定位中…',
  tagJumpable: '可定位',
  tagNotLoaded: '未加载',
  noText: '(无文本)',
  jumpAria: '跳转到：{text}',
  copied: '已复制',
  copyText: '复制文本',
  copyAria: '复制消息文本',
  capNotice: '仅显示最近 {shown} 条匹配消息（共 {total} 条）；使用搜索框可缩小范围。',
  emptyFiltered: '没有匹配的消息。',
  emptySession: '这个会话里还没有你发起的消息。',
  moreNotice: '已显示全部 {total} 条你发送的消息；{beyond} 条位于已加载窗口之外（点击可自动加载并定位，或先向上滚动加载）。',
  imagePlaceholder: '[图片]',
  toolCall: '[工具: {name}]',
}

const en: typeof zh = {
  fetchFail: 'Failed to read the full history',
  timeout: 'Request timed out',
  scrollMiss: 'Found the message, but the page did not scroll — click it once more.',
  rendering: 'That message is still rendering; try again in a moment.',
  locating: 'Locating that message…',
  autoLoadGiveUp: 'Stopped after loading {pages} pages without finding the message. Scroll up to load earlier history and retry.',
  loadingEarlier: 'Loading earlier history to locate that message…',
  loadEarlierFail: 'Failed to load earlier history; cannot locate that message.',
  earliestNotFound: 'Reached the earliest record of this session without finding the message (it may have been deleted).',
  noAutoLoad: 'That message is in earlier history that is not loaded into the conversation window yet. Auto-load is unavailable here — scroll up to load it first.',
  copyFail: 'Copy failed.',
  badgeAria: 'My messages',
  badge: 'My messages ({count})',
  searchPlaceholder: 'Search the messages you sent…',
  newestFirst: 'Newest first',
  oldestFirst: 'Oldest first',
  loading: 'Reading the full history…',
  loadErrorPrefix: 'Failed to read the full history: {error} (showing only messages in the loaded window)',
  unknownError: 'unknown error',
  retry: 'Retry',
  tagPending: 'Locating…',
  tagJumpable: 'Jumpable',
  tagNotLoaded: 'Not loaded',
  noText: '(no text)',
  jumpAria: 'Jump to: {text}',
  copied: 'Copied',
  copyText: 'Copy text',
  copyAria: 'Copy message text',
  capNotice: 'Showing only the newest {shown} matches (of {total}); narrow it down with the search box.',
  emptyFiltered: 'No matching messages.',
  emptySession: 'You have not sent any messages in this session yet.',
  moreNotice: 'Showing all {total} messages you sent; {beyond} are outside the loaded window (click to auto-load and locate, or scroll up first).',
  imagePlaceholder: '[image]',
  toolCall: '[tool: {name}]',
}

const TABLES: Record<Lang, typeof zh> = { zh, en }

let lang: Lang = 'en'
try {
  const nav = typeof navigator !== 'undefined' ? (navigator.language || '') : ''
  if (/^zh/i.test(String(nav))) lang = 'zh'
} catch { /* no navigator */ }

/** Translate `key` in the active language, interpolating {param} placeholders. */
export function t(key: keyof typeof zh, params?: Record<string, string | number>): string {
  let template: string = TABLES[lang][key] ?? TABLES.en[key] ?? String(key)
  if (params !== undefined) {
    for (const [k, v] of Object.entries(params)) {
      template = template.split(`{${k}}`).join(String(v))
    }
  }
  return template
}

/** Adopt the host's resolved locale when it reports zh/en. */
export function syncHostLocale(ctx: unknown): void {
  try {
    const locale = (ctx as { locale?: { snapshot?: () => unknown } }).locale
    const snap = locale?.snapshot?.() as { active?: unknown; locale?: unknown; language?: unknown } | undefined
    const code = String((snap && (snap.active ?? snap.locale ?? snap.language)) || '')
    if (/^zh/i.test(code)) lang = 'zh'
    else if (/^en/i.test(code)) lang = 'en'
  } catch { /* runtime without locale service */ }
}

/** Test seam: pin the language. */
export function setLang(next: Lang): void { lang = next }
