import type { ResolvedAppearance } from "@/lib/embed/appearance";
import { WIDGET_COPY, type WidgetLang } from "@/lib/embed/widget-text";

/**
 * The chat window's header and welcome panel. ONE component, rendered by the
 * real widget (app/embed/chat/page.tsx) and by the admin preview
 * (components/admin-widget-appearance.tsx), so the preview cannot drift from
 * what visitors see.
 *
 * Every value here is rendered as text or as a typed style property — no HTML
 * strings — and colors/URLs arrive already validated by resolveAppearance().
 */

export function WidgetAvatar({
	appearance,
	botIcon,
	size = 40,
}: {
	appearance: ResolvedAppearance;
	botIcon?: string;
	size?: number;
}) {
	return (
		<div
			className="rounded-full flex items-center justify-center overflow-hidden shrink-0"
			style={{
				width: size,
				height: size,
				backgroundColor: appearance.avatarBackground,
				boxShadow: appearance.avatarRing
					? `0 0 0 2px ${appearance.avatarRing}`
					: undefined,
				fontSize: size * 0.6,
			}}
		>
			{appearance.avatarUrl ? (
				<img
					src={appearance.avatarUrl}
					alt=""
					width={size}
					height={size}
					className="w-full h-full object-cover"
				/>
			) : (
				<span aria-hidden="true">{botIcon || "💬"}</span>
			)}
		</div>
	);
}

export function WidgetHeader({
	appearance,
	botName,
	botIcon,
	language,
	onClose,
}: {
	appearance: ResolvedAppearance;
	botName?: string;
	botIcon?: string;
	language: WidgetLang;
	onClose?: () => void;
}) {
	const t = WIDGET_COPY[language];
	return (
		<div
			className="flex items-center justify-between p-4 border-b shadow-sm"
			style={{ backgroundColor: appearance.headerColor }}
		>
			<div className="flex items-center gap-3 min-w-0">
				<WidgetAvatar appearance={appearance} botIcon={botIcon} />
				<h1
					className="text-lg font-semibold truncate"
					style={{ color: appearance.headerText }}
				>
					{botName || t.defaultBotName}
				</h1>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="p-2 rounded-full transition-opacity opacity-70 hover:opacity-100"
				style={{ color: appearance.headerText }}
				aria-label={t.close}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</button>
		</div>
	);
}

/**
 * The owner's saved welcome for this language replaces the built-in title and
 * subtitle; without one, the built-in pair for THIS language shows.
 */
export function WidgetWelcome({
	welcomeMessage,
	language,
}: {
	welcomeMessage?: string;
	language: WidgetLang;
}) {
	const t = WIDGET_COPY[language];
	return (
		<div className="text-center mb-6">
			{welcomeMessage ? (
				<p className="text-gray-700 whitespace-pre-line">{welcomeMessage}</p>
			) : (
				<>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">
						{t.welcomeTitle}
					</h2>
					<p className="text-gray-600">{t.welcomeSubtitle}</p>
				</>
			)}
		</div>
	);
}
