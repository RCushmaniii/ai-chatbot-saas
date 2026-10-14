export type Lang = "en" | "es";

export interface Scenario {
	id: string;
	/** The visitor's language. Every reply must be written in it. */
	lang: Lang;
	/**
	 * Messages sent in ONE conversation, in order, through the real chat API
	 * (same visitor, same session, the server's conversationId carried back).
	 * Only the reply to the LAST turn is judged; earlier turns must return 200.
	 */
	turns: string[];
	/** The host page the widget is open on, as the loader reports it. */
	page?: { url: string; title: string };
	/** Extra request-body fields (e.g. a foreign businessId probe). */
	body?: Record<string, unknown>;
	note?: string;
	expect: {
		/** HTTP status the last turn must return (default 200). */
		status?: number;
		/** Reply contains every one of these (case-insensitive). */
		includesAll?: string[];
		/** Reply contains at least one of these (case-insensitive). */
		includesAny?: string[];
		/** Reply contains none of these (case-insensitive). */
		excludesAll?: string[];
		/** Reply must not match this regex (case-insensitive). */
		excludesPattern?: string;
		/** No links of any kind. */
		noLinks?: boolean;
		/**
		 * Word TARGET. Up to WORD_ALLOWANCE over is reported, not failed;
		 * beyond that it fails.
		 */
		maxWords?: number;
	};
}

export interface TenantSuite {
	name: string;
	/** The deployment that serves this tenant's widget. */
	defaultUrl: string;
	/** Origin header the gate sends — the tenant's own site. */
	origin: string;
	/** Page URL sent when a scenario names none. */
	defaultPage: Record<Lang, string>;
	linkHosts: string[];
	allowedPrices: string[];
	bannedPhrases: string[];
	promptFragments: string[];
	scenarios: Scenario[];
}
