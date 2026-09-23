import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { UserBusiness } from "@/lib/auth";

/**
 * Says, in words, which account this console is editing and what is in it.
 *
 * Every tab below writes rows scoped to the SIGNED-IN user's business. The
 * public embed widget answers from DEFAULT_BUSINESS_ID. Those are two different
 * things, and until 2026-09-23 nothing on the page acknowledged that either
 * could exist, let alone that they might differ.
 *
 * The status lines follow the vocabulary rule proven in
 * cushlabs-messenger-bot/admin: say what is TRUE of the thing in a full
 * sentence, including the boring and the broken cases, rather than showing a
 * number and leaving the reader to infer what it means. A knowledge count of
 * zero is the exact case that previously read as "this product is broken" when
 * it actually meant "this account was created a moment ago and is empty" — so
 * that sentence is written out rather than implied by a dash.
 */
export function AdminAccountContext({
	businessName,
	businessId,
	servingBusinessId,
	businesses,
}: {
	businessName: string;
	businessId: string;
	servingBusinessId?: string;
	businesses: UserBusiness[];
}) {
	const current = businesses.find((b) => b.businessId === businessId);
	const servesWidget = Boolean(
		servingBusinessId && servingBusinessId === businessId,
	);
	const others = businesses.filter((b) => b.businessId !== businessId);
	const isEmpty = current ? current.knowledgeChunks === 0 : false;

	return (
		<section className="mb-8 space-y-4">
			{/* Which widget, if any, this account is behind. */}
			{servingBusinessId &&
				(servesWidget ? (
					<Notice tone="ok" icon={<CheckCircle2 className="h-4 w-4" />}>
						<strong className="font-semibold">
							This account serves the public chat widget on this deployment.
						</strong>{" "}
						Changes you save here affect what real visitors are told.
					</Notice>
				) : (
					<Notice tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>
						<strong className="font-semibold">
							You are not editing the assistant on this site.
						</strong>{" "}
						The public chat widget on this deployment is served by a different
						business. Everything you change here applies to{" "}
						<strong>{businessName}</strong> only, and will not affect that
						widget.
					</Notice>
				))}

			{/* What is actually in this account. Zero is stated, not implied. */}
			{current && (
				<Notice tone="info" icon={<Info className="h-4 w-4" />}>
					{isEmpty ? (
						<>
							<strong className="font-semibold">
								This account has no knowledge base yet.
							</strong>{" "}
							Nothing has been added to <strong>{businessName}</strong>, so its
							bot has nothing to answer from and every count on the tabs below
							will read zero. That is expected for a new account, not a fault.
						</>
					) : (
						<>
							<strong>{businessName}</strong> has{" "}
							<strong>{current.knowledgeChunks}</strong> knowledge{" "}
							{current.knowledgeChunks === 1 ? "chunk" : "chunks"} and{" "}
							{current.hasPersona
								? "a configured persona"
								: "no persona configured yet"}
							.
						</>
					)}
				</Notice>
			)}

			{/* Everything else this login can reach. */}
			{others.length > 0 && (
				<div className="rounded-lg border p-4">
					<p className="text-sm font-semibold">
						Other accounts this login can reach
					</p>
					<p className="mt-1 text-sm text-muted-foreground">
						This console edits one account at a time. Switching is not built
						yet, so these are listed for reference.
					</p>
					<ul className="mt-3 space-y-1.5">
						{others.map((b) => (
							<li
								key={b.businessId}
								className="flex flex-wrap items-center gap-2 text-sm"
							>
								<span className="font-medium">{b.businessName}</span>
								<span className="text-muted-foreground capitalize">
									{b.role}
								</span>
								<span className="text-muted-foreground">
									{b.knowledgeChunks} knowledge{" "}
									{b.knowledgeChunks === 1 ? "chunk" : "chunks"}
								</span>
								{servingBusinessId === b.businessId && (
									<span className="rounded-md border border-amber-400 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-300">
										serves this site's widget
									</span>
								)}
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	);
}

function Notice({
	tone,
	icon,
	children,
}: {
	tone: "ok" | "warn" | "info";
	icon: React.ReactNode;
	children: React.ReactNode;
}) {
	const toneClass = {
		ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
		warn: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
		info: "border-border bg-muted/50 text-foreground",
	}[tone];

	return (
		<div
			role={tone === "warn" ? "alert" : undefined}
			className={`flex gap-3 rounded-lg border p-4 text-sm ${toneClass}`}
		>
			<span className="mt-0.5 shrink-0">{icon}</span>
			<p className="leading-relaxed">{children}</p>
		</div>
	);
}
