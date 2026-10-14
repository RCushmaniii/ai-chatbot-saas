"use client";

import { ImageUp, Loader2, RotateCcw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WidgetHeader, WidgetWelcome } from "@/components/widget/widget-chrome";
import {
	DEFAULT_AVATAR_BACKGROUND,
	DEFAULT_BUTTON_COLOR,
	DEFAULT_HEADER_COLOR,
	POPULAR_SWATCHES,
	resolveAppearance,
} from "@/lib/embed/appearance";
import { isHexColor } from "@/lib/embed/sanitize";
import {
	localizeWidgetText,
	type SavedStarterQuestion,
	WIDGET_COPY,
	type WidgetLang,
} from "@/lib/embed/widget-text";

/**
 * The widget appearance editor, for owners who are not designers.
 *
 * Everything here is a draft until Save. The sticky bar at the bottom shows
 * whenever the draft differs from what is saved, with Undo (back to the saved
 * version) and Save. The preview on the right renders the SAME header and
 * welcome components the live widget renders (components/widget/widget-chrome),
 * in English or Spanish, so what the owner sees is what visitors get.
 *
 * Nothing is pre-filled with a new look: an empty field means "the look you
 * have today", so opening this screen and pressing Save changes nothing.
 */

const FIELDS = [
	"headerColor",
	"avatarBackground",
	"avatarRing",
	"avatarUrl",
	"buttonColor",
	"position",
	"welcomeMessage",
	"welcomeMessage_es",
	"placeholder",
	"placeholder_es",
] as const;
type Field = (typeof FIELDS)[number];
type Draft = Partial<Record<Field, string>>;

function pickDraft(saved: Record<string, unknown> | null | undefined): Draft {
	const draft: Draft = {};
	for (const key of FIELDS) {
		const value = saved?.[key];
		if (typeof value === "string" && value) draft[key] = value;
	}
	return draft;
}

function sameDraft(a: Draft, b: Draft) {
	return FIELDS.every((k) => (a[k] ?? "") === (b[k] ?? ""));
}

/**
 * The most common distinct colors of an image, for "swatches from your
 * avatar". Runs on a 32×32 copy; transparent and near-duplicate colors are
 * skipped. Returns [] if the image cannot be read (a cross-origin image
 * without CORS taints the canvas).
 */
async function swatchesFrom(src: string): Promise<string[]> {
	const img = new Image();
	img.crossOrigin = "anonymous";
	img.src = src;
	try {
		await img.decode();
		const canvas = document.createElement("canvas");
		canvas.width = 32;
		canvas.height = 32;
		const ctx = canvas.getContext("2d");
		if (!ctx) return [];
		ctx.drawImage(img, 0, 0, 32, 32);
		const { data } = ctx.getImageData(0, 0, 32, 32);
		const counts = new Map<string, number>();
		for (let i = 0; i < data.length; i += 4) {
			if (data[i + 3] < 200) continue;
			// 16 levels per channel: groups near-identical pixels.
			const q = (v: number) => Math.min(255, Math.round(v / 17) * 17);
			const hex = `#${[data[i], data[i + 1], data[i + 2]]
				.map((v) => q(v).toString(16).padStart(2, "0"))
				.join("")}`;
			counts.set(hex, (counts.get(hex) ?? 0) + 1);
		}
		const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
		const picked: string[] = [];
		const rgb = (h: string) =>
			[1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
		for (const [hex] of sorted) {
			const [r, g, b] = rgb(hex);
			const distinct = picked.every((p) => {
				const [pr, pg, pb] = rgb(p);
				return Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb) > 90;
			});
			if (distinct) picked.push(hex);
			if (picked.length === 5) break;
		}
		return picked;
	} catch {
		return [];
	}
}

function Swatch({
	color,
	selected,
	onPick,
}: {
	color: string;
	selected: boolean;
	onPick: (c: string) => void;
}) {
	return (
		<button
			type="button"
			title={color}
			aria-label={`Use ${color}`}
			aria-pressed={selected}
			onClick={() => onPick(color)}
			className={`h-7 w-7 rounded-full border transition-transform hover:scale-110 ${
				selected ? "ring-2 ring-offset-2 ring-primary" : ""
			}`}
			style={{ backgroundColor: color }}
		/>
	);
}

/**
 * One color: a real picker, swatches (from the avatar, then popular ones) and a
 * hex box. A hex box value only reaches the draft once it is a valid color, so
 * a half-typed "#1c4" never shows up in the preview as something else.
 */
function ColorField({
	id,
	label,
	help,
	value,
	fallback,
	onChange,
	avatarSwatches,
	clearLabel,
}: {
	id: string;
	label: string;
	help?: string;
	value: string | undefined;
	/** What the widget shows when nothing is saved. */
	fallback: string;
	onChange: (v: string | undefined) => void;
	avatarSwatches: string[];
	/** When set, offers a button that clears the value (e.g. "No ring"). */
	clearLabel?: string;
}) {
	const [text, setText] = useState(value ?? "");
	useEffect(() => setText(value ?? ""), [value]);
	const shown = value ?? fallback;
	const invalid = text !== "" && !isHexColor(text);

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor={`${id}-hex`}>{label}</Label>
				{clearLabel && (
					<Button
						type="button"
						variant={value ? "outline" : "secondary"}
						size="sm"
						onClick={() => onChange(undefined)}
						aria-pressed={!value}
					>
						{clearLabel}
					</Button>
				)}
			</div>
			{help && <p className="text-xs text-muted-foreground">{help}</p>}
			<div className="flex items-center gap-2">
				<input
					type="color"
					aria-label={`${label}: color picker`}
					value={isHexColor(shown) && shown.length === 7 ? shown : "#ffffff"}
					onChange={(e) => onChange(e.target.value)}
					className="h-10 w-12 cursor-pointer rounded border bg-transparent p-1"
				/>
				<Input
					id={`${id}-hex`}
					value={text}
					placeholder={fallback}
					onChange={(e) => {
						const next = e.target.value.trim();
						setText(next);
						if (next === "") onChange(undefined);
						else if (isHexColor(next)) onChange(next);
					}}
					aria-invalid={invalid}
					className={`w-32 font-mono ${invalid ? "border-destructive" : ""}`}
				/>
			</div>
			{invalid && (
				<p className="text-xs text-destructive">
					Use a hex color like #1c4992.
				</p>
			)}
			{avatarSwatches.length > 0 && (
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-xs text-muted-foreground w-20">
						From avatar
					</span>
					{avatarSwatches.map((c) => (
						<Swatch
							key={`a-${c}`}
							color={c}
							selected={value?.toLowerCase() === c.toLowerCase()}
							onPick={onChange}
						/>
					))}
				</div>
			)}
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-xs text-muted-foreground w-20">Popular</span>
				{POPULAR_SWATCHES.map((c) => (
					<Swatch
						key={c}
						color={c}
						selected={value?.toLowerCase() === c.toLowerCase()}
						onPick={onChange}
					/>
				))}
			</div>
		</div>
	);
}

function AvatarField({
	value,
	onChange,
	onSwatches,
}: {
	value: string | undefined;
	onChange: (url: string | undefined) => void;
	onSwatches: (colors: string[]) => void;
}) {
	const [dragging, setDragging] = useState(false);
	const [uploading, setUploading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const upload = async (file: File | undefined) => {
		if (!file) return;
		if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
			toast.error("Use a PNG, JPG or WebP image.");
			return;
		}
		if (file.size > 1024 * 1024) {
			toast.error("The image must be 1 MB or smaller.");
			return;
		}
		setUploading(true);
		// Swatches from the local file: always readable, no CORS involved.
		const local = URL.createObjectURL(file);
		swatchesFrom(local)
			.then(onSwatches)
			.finally(() => URL.revokeObjectURL(local));
		try {
			const body = new FormData();
			body.append("file", file);
			const res = await fetch("/api/admin/avatar", { method: "POST", body });
			const data = await res.json().catch(() => ({}));
			if (!res.ok || typeof data.url !== "string") {
				throw new Error(data.error || "Upload failed");
			}
			onChange(data.url);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className="space-y-2">
			<Label>Avatar</Label>
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDragging(false);
					upload(e.dataTransfer.files?.[0]);
				}}
				className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm transition-colors ${
					dragging
						? "border-primary bg-primary/5"
						: "border-muted-foreground/30"
				}`}
			>
				{uploading ? (
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				) : (
					<ImageUp className="h-6 w-6 text-muted-foreground" />
				)}
				<span>
					{uploading
						? "Uploading…"
						: "Drag an image here, or click to choose one"}
				</span>
				<span className="text-xs text-muted-foreground">
					PNG, JPG or WebP, up to 1 MB. A square image looks best.
				</span>
			</button>
			<input
				ref={inputRef}
				type="file"
				accept="image/png,image/jpeg,image/webp"
				className="hidden"
				onChange={(e) => {
					upload(e.target.files?.[0]);
					e.target.value = "";
				}}
			/>
			{value && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => {
						onChange(undefined);
						onSwatches([]);
					}}
				>
					Back to the standard avatar
				</Button>
			)}
		</div>
	);
}

function WidgetPreview({
	draft,
	botName,
	botIcon,
	questions,
}: {
	draft: Draft;
	botName?: string;
	botIcon?: string;
	questions: SavedStarterQuestion[];
}) {
	const [lang, setLang] = useState<WidgetLang>("en");
	const appearance = resolveAppearance(draft);
	const text = localizeWidgetText(draft, questions, lang);
	const t = WIDGET_COPY[lang];
	const chips = text.suggestedQuestions ?? t.suggested;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<div>
						<CardTitle>Preview</CardTitle>
						<CardDescription>
							What visitors see when they open the chat
						</CardDescription>
					</div>
					<fieldset className="inline-flex rounded-md border p-0.5">
						<legend className="sr-only">Preview language</legend>
						{(["en", "es"] as const).map((l) => (
							<button
								key={l}
								type="button"
								onClick={() => setLang(l)}
								aria-pressed={lang === l}
								className={`rounded px-3 py-1 text-sm ${
									lang === l ? "bg-primary text-primary-foreground" : ""
								}`}
							>
								{l === "en" ? "English" : "Español"}
							</button>
						))}
					</fieldset>
				</div>
			</CardHeader>
			<CardContent>
				<div className="mx-auto flex h-[520px] w-full max-w-[400px] flex-col overflow-hidden rounded-[20px] border bg-white shadow-lg">
					<WidgetHeader
						appearance={appearance}
						botName={botName}
						botIcon={botIcon}
						language={lang}
					/>
					<div className="flex flex-1 flex-col items-center justify-center space-y-4 overflow-y-auto bg-gray-50 p-4">
						<WidgetWelcome
							welcomeMessage={text.welcomeMessage}
							language={lang}
						/>
						<div className="w-full space-y-2">
							<p className="mb-3 text-sm font-medium text-gray-700">
								{t.quickLabel}
							</p>
							{chips.map((q) => (
								<div
									key={q}
									className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700"
								>
									{q}
								</div>
							))}
						</div>
					</div>
					<div className="border-t bg-white p-4">
						<div className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-400">
							{text.placeholder ?? t.placeholder}
						</div>
					</div>
				</div>
				<div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted-foreground">
					<span>Chat button</span>
					<span
						className="inline-block h-10 w-10 rounded-full shadow"
						style={{
							backgroundColor: isHexColor(draft.buttonColor)
								? draft.buttonColor
								: DEFAULT_BUTTON_COLOR,
						}}
					/>
				</div>
			</CardContent>
		</Card>
	);
}

function BilingualText({
	label,
	help,
	enValue,
	esValue,
	enFallback,
	esFallback,
	onEn,
	onEs,
	multiline,
	max,
}: {
	label: string;
	help: string;
	enValue?: string;
	esValue?: string;
	enFallback: string;
	esFallback: string;
	onEn: (v: string | undefined) => void;
	onEs: (v: string | undefined) => void;
	multiline?: boolean;
	max: number;
}) {
	const Field = multiline ? Textarea : Input;
	return (
		<div className="space-y-2">
			<Label>{label}</Label>
			<p className="text-xs text-muted-foreground">{help}</p>
			<div className="grid gap-3 sm:grid-cols-2">
				{(
					[
						["English", enValue, enFallback, onEn],
						["Español", esValue, esFallback, onEs],
					] as const
				).map(([lang, value, fallback, set]) => (
					<div key={lang} className="space-y-1">
						<span className="text-xs font-medium text-muted-foreground">
							{lang}
						</span>
						<Field
							aria-label={`${label} (${lang})`}
							value={value ?? ""}
							placeholder={fallback}
							maxLength={max}
							rows={multiline ? 4 : undefined}
							onChange={(e) => set(e.target.value || undefined)}
						/>
					</div>
				))}
			</div>
		</div>
	);
}

export function AdminWidgetAppearance() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState<Draft>({});
	const [draft, setDraft] = useState<Draft>({});
	const [botName, setBotName] = useState<string>();
	const [botIcon, setBotIcon] = useState<string>();
	const [questions, setQuestions] = useState<SavedStarterQuestion[]>([]);
	const [avatarSwatches, setAvatarSwatches] = useState<string[]>([]);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/admin/settings");
			if (res.status === 404) return;
			if (!res.ok) throw new Error("load failed");
			const data = await res.json();
			const current = pickDraft(data.embedSettings);
			setSaved(current);
			setDraft(current);
			setBotName(data.botName ?? undefined);
			setBotIcon(data.embedSettings?.botIcon ?? undefined);
			setQuestions(data.starterQuestions ?? []);
			if (current.avatarUrl)
				swatchesFrom(current.avatarUrl).then(setAvatarSwatches);
		} catch {
			toast.error("Could not load your widget settings. Refresh to try again.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const dirty = useMemo(() => !sameDraft(draft, saved), [draft, saved]);
	const set = (key: Field) => (value: string | undefined) =>
		setDraft((d) => ({ ...d, [key]: value }));

	const save = async () => {
		setSaving(true);
		try {
			// Every field is sent: a value saves it, null clears it back to the
			// default (standard avatar, no ring, built-in text).
			const embedSettings = Object.fromEntries(
				FIELDS.map((k) => [k, draft[k] ?? null]),
			);
			const res = await fetch("/api/admin/settings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ embedSettings }),
			});
			if (!res.ok) throw new Error("save failed");
			setSaved(draft);
			toast.success("Saved. Visitors see the change within about a minute.");
		} catch {
			toast.error("Could not save. Nothing was changed.");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const headerShown = draft.headerColor ?? DEFAULT_HEADER_COLOR;

	return (
		<div className="space-y-6 pb-24">
			<div>
				<h2 className="text-2xl font-bold">Chat widget</h2>
				<p className="text-muted-foreground">
					How the chat looks and what it says before the first message. Empty
					fields keep the look you have today.
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Colors and avatar</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<AvatarField
								value={draft.avatarUrl}
								onChange={set("avatarUrl")}
								onSwatches={setAvatarSwatches}
							/>
							<ColorField
								id="headerColor"
								label="Header color"
								help="The bar at the top of the chat. The title switches to white or dark text automatically so it stays readable."
								value={draft.headerColor}
								fallback={DEFAULT_HEADER_COLOR}
								onChange={set("headerColor")}
								avatarSwatches={avatarSwatches}
							/>
							<ColorField
								id="avatarBackground"
								label="Behind the avatar"
								help="The circle behind your avatar."
								value={draft.avatarBackground}
								fallback={
									draft.headerColor ? headerShown : DEFAULT_AVATAR_BACKGROUND
								}
								onChange={set("avatarBackground")}
								avatarSwatches={avatarSwatches}
								clearLabel="Same as header"
							/>
							<ColorField
								id="avatarRing"
								label="Ring around the avatar"
								value={draft.avatarRing}
								fallback="no ring"
								onChange={set("avatarRing")}
								avatarSwatches={avatarSwatches}
								clearLabel="No ring"
							/>
							<ColorField
								id="buttonColor"
								label="Chat button"
								help="The round button that opens the chat, on sites that use our standard install code."
								value={draft.buttonColor}
								fallback={DEFAULT_BUTTON_COLOR}
								onChange={set("buttonColor")}
								avatarSwatches={avatarSwatches}
							/>
							<div className="space-y-2">
								<Label>Button position</Label>
								<Select
									value={draft.position ?? "bottom-right"}
									onValueChange={(v) => set("position")(v)}
								>
									<SelectTrigger className="w-48">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="bottom-right">Bottom right</SelectItem>
										<SelectItem value="bottom-left">Bottom left</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Text visitors read</CardTitle>
							<CardDescription>
								English visitors see the English column, Spanish visitors the
								Spanish one. Leave a box empty to use the standard text shown in
								grey. One language never fills in for the other.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<BilingualText
								label="Welcome note"
								help="Shown when the chat opens, and in the small note beside the chat button."
								enValue={draft.welcomeMessage}
								esValue={draft.welcomeMessage_es}
								enFallback={WIDGET_COPY.en.welcomeSubtitle}
								esFallback={WIDGET_COPY.es.welcomeSubtitle}
								onEn={set("welcomeMessage")}
								onEs={set("welcomeMessage_es")}
								multiline
								max={500}
							/>
							<BilingualText
								label="Input hint"
								help="The grey text inside the message box."
								enValue={draft.placeholder}
								esValue={draft.placeholder_es}
								enFallback={WIDGET_COPY.en.placeholder}
								esFallback={WIDGET_COPY.es.placeholder}
								onEn={set("placeholder")}
								onEs={set("placeholder_es")}
								max={120}
							/>
							<p className="text-xs text-muted-foreground">
								Quick questions are edited on the Settings tab, in both
								languages.
							</p>
						</CardContent>
					</Card>
				</div>

				<div className="lg:sticky lg:top-4 lg:self-start">
					<WidgetPreview
						draft={draft}
						botName={botName}
						botIcon={botIcon}
						questions={questions}
					/>
				</div>
			</div>

			{dirty && (
				<div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur">
					<div className="flex items-center justify-between gap-3">
						<span className="text-sm font-medium">
							You have unsaved changes
						</span>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setDraft(saved)}
								disabled={saving}
							>
								<RotateCcw className="mr-2 h-4 w-4" />
								Undo
							</Button>
							<Button type="button" onClick={save} disabled={saving}>
								{saving ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Save className="mr-2 h-4 w-4" />
								)}
								Save
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
