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
import { type ReactElement } from 'react';
import type { Context } from 'cordis';
import { type HistoryChatSnapshot, type HistorySessionSnapshot } from './util';
/** ------------------------------------------------------------------ types */
/** The client slots service face (structural subset used here). */
interface HistorySlotsService {
    inject(key: string, callback: () => () => void): () => void;
    register(options: {
        name: string;
        id?: string;
        order?: number;
    }, component: (props: HistoryDockProps) => ReactElement): () => void;
}
/** The client sessions service face (structural subset used here). */
interface ClientSessionsService {
    binding(id: string): {
        session: {
            loadOlder(): Promise<void>;
        };
    } | undefined;
}
/** Props the dock slot renders with. */
interface HistoryDockProps {
    session?: HistorySessionSnapshot;
    /** Standard kit: the composer input state hook (per-session). */
    useInput?: <T>(selector: (s: InputState) => T) => T;
    /** Standard kit: the composer input action face. */
    inputActions?: InputActions;
    /** Standard kit: selector hook over the current Chat target snapshot (DSH 0.1.5+). */
    useChat?: <T>(selector: (s: HistoryChatSnapshot) => T) => T;
}
/** The composer input state slice this plugin reads (structural subset). */
interface InputState {
    readonly draft: string;
    readonly phase: 'plain' | 'adjudicating' | 'claimed' | 'submitting';
    /** Present exactly while claimed/submitting (a '/' or '@' trigger menu). */
    readonly claim?: unknown;
}
/** The composer input action face (structural subset). */
interface InputActions {
    setDraft(text: string): void;
}
/** Timer service face (optional; used to auto-clear the copy feedback). */
interface HistoryTimer {
    timeout(callback: () => void, delay: number): () => void;
}
declare module 'cordis' {
    interface Context {
        slots: HistorySlotsService;
        sessions?: ClientSessionsService;
        timer?: HistoryTimer;
    }
}
/** ------------------------------------------------------------------ plugin */
/** Services required before mounting: the slot registry. */
export declare const inject: string[];
/**
 * Client plugin body: inject the stylesheet and register the dock row.
 * @param ctx - client plugin context (slots, sessions, timer).
 */
export declare function apply(ctx: Context): void;
export {};
//# sourceMappingURL=index.d.ts.map