/**
 * Minimal zh/en string table for the client UI.
 *
 * English is the default; Chinese is used only when the host locale service
 * (or, failing that, the browser language) reports a zh locale. The host's
 * locale snapshot has the shape { active, locales, revision } — `active` is
 * the resolved locale id.
 */
type Lang = 'zh' | 'en';
declare const zh: {
    fetchFail: string;
    timeout: string;
    scrollMiss: string;
    rendering: string;
    locating: string;
    autoLoadGiveUp: string;
    loadingEarlier: string;
    loadEarlierFail: string;
    earliestNotFound: string;
    noAutoLoad: string;
    copyFail: string;
    badgeAria: string;
    badge: string;
    searchPlaceholder: string;
    newestFirst: string;
    oldestFirst: string;
    loading: string;
    loadErrorPrefix: string;
    unknownError: string;
    retry: string;
    tagPending: string;
    tagJumpable: string;
    tagNotLoaded: string;
    noText: string;
    jumpAria: string;
    copied: string;
    copyText: string;
    copyAria: string;
    capNotice: string;
    emptyFiltered: string;
    emptySession: string;
    moreNotice: string;
    imagePlaceholder: string;
    toolCall: string;
};
/** Translate `key` in the active language, interpolating {param} placeholders. */
export declare function t(key: keyof typeof zh, params?: Record<string, string | number>): string;
/** Adopt the host's resolved locale when it reports zh/en. */
export declare function syncHostLocale(ctx: unknown): void;
/** Test seam: pin the language. */
export declare function setLang(next: Lang): void;
export {};
//# sourceMappingURL=i18n.d.ts.map