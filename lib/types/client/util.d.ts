/** One materialized chat node (user or steering message). */
export interface HistoryChatNode {
    kind?: string;
    key?: string;
    anchorSeq?: number;
    visibility?: string;
    data?: {
        seq?: number;
        time?: number;
        content?: readonly HistoryContentBlock[];
    };
}
/** One content block (structural subset: the text/image/tool shapes). */
export interface HistoryContentBlock {
    type?: string;
    text?: string;
    name?: string;
}
/** One rendered list row. */
export interface HistoryRow {
    seq: number;
    time: number;
    text: string;
    key: string | null;
}
/**
 * The Session snapshot slice this plugin reads (structural subset of DSH's
 * `SessionSnapshot`). It arrives as the dock's owner share (`props.session`)
 * and carries lifecycle/history state only: since DSH 0.1.5 the rendered Chat
 * nodes live in a separate Chat-target snapshot ({@link HistoryChatSnapshot}).
 */
export interface HistorySessionSnapshot {
    sessionId?: string;
    hasMore?: boolean;
    loadingOlder?: boolean;
}
/**
 * The Chat target snapshot slice this plugin reads (structural subset of DSH
 * 0.1.5's `ChatSnapshot`). It is reached through the `useChat` selector hook
 * that the framework injects into `conversation.input.dock` standard props;
 * the older `props.session.chat` path no longer exists.
 */
export interface HistoryChatSnapshot {
    nodes?: {
        values(): readonly HistoryChatNode[];
    };
}
/** Flatten one message's content blocks to a single preview string. */
export declare function textOf(content: readonly HistoryContentBlock[] | undefined): string;
/** Format a Unix epoch ms timestamp: same-day → HH:mm; else YYYY-MM-DD HH:mm. */
export declare function fmtTime(ms: number): string;
/** Collect the user/steering messages in the loaded window + seq→key map. */
export declare function collectWindowItems(chat: HistoryChatSnapshot | undefined): {
    items: HistoryRow[];
    keys: Map<number, string>;
};
/** Find the conversation row DOM element for a chat-node anchor key. */
export declare function findAnchor(key: string): HTMLElement | null;
/** Scroll a message row into view (centered) and flash-highlight it.
 *  Positions the conversation scrollport directly (synchronous, reliable),
 *  rather than relying on async scrollIntoView which can silently no-op. */
export declare function scrollToKey(key: string): boolean;
/** Copy text to the clipboard (Clipboard API first, execCommand fallback). */
export declare function copyText(text: string): Promise<boolean>;
//# sourceMappingURL=util.d.ts.map