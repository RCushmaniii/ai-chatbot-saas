"use client";

import {
	Code,
	CreditCard,
	Database,
	Globe,
	Headphones,
	MessageSquare,
	Phone,
	RefreshCw,
	Settings,
	Users,
	Workflow,
} from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { AdminKnowledgeBase } from "@/components/admin-knowledge-base";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WHATSAPP_ENABLED } from "@/lib/features";

/**
 * Every tab this console can open. The URL is the source of truth for which one
 * is showing — the pattern cushlabs-messenger-bot/admin uses, where the route
 * lives in the address bar and component state only mirrors it.
 *
 * What that buys, none of which worked when the open tab was local state: a tab
 * can be linked to, a reload stays where you were, Back retraces your clicks
 * instead of leaving the console, and a bug report can name the screen. It also
 * means an operator being walked through a problem can be sent a URL rather than
 * a sentence describing which tab to click.
 *
 * An unknown or absent ?tab= falls back to Knowledge rather than rendering an
 * empty shell, so a hand-edited or stale link degrades to a working page.
 */
const TAB_VALUES = [
	"manual",
	"website",
	"contacts",
	"playbooks",
	"livechat",
	"retraining",
	"settings",
	"prompts",
	"embed",
	"whatsapp",
	"billing",
] as const;

type TabValue = (typeof TAB_VALUES)[number];
const DEFAULT_TAB: TabValue = "manual";

function isTabValue(v: string | null): v is TabValue {
	return v !== null && (TAB_VALUES as readonly string[]).includes(v);
}

// Lazy-load tab content — only the default "Knowledge" tab is eagerly loaded.
// Each tab's code is fetched on-demand when the user clicks the tab.
const AdminWebsiteScraping = dynamic(
	() =>
		import("@/components/admin-website-scraping").then(
			(m) => m.AdminWebsiteScraping,
		),
	{ ssr: false },
);
const AdminContactsTab = dynamic(
	() =>
		import("@/components/admin-contacts/admin-contacts-tab").then(
			(m) => m.AdminContactsTab,
		),
	{ ssr: false },
);
const AdminPlaybooksTab = dynamic(
	() =>
		import("@/components/admin-playbooks/admin-playbooks-tab").then(
			(m) => m.AdminPlaybooksTab,
		),
	{ ssr: false },
);
const AdminLiveChatTab = dynamic(
	() =>
		import("@/components/admin-live-chat/admin-live-chat-tab").then(
			(m) => m.AdminLiveChatTab,
		),
	{ ssr: false },
);
const AdminRetrainingTab = dynamic(
	() =>
		import("@/components/admin-retraining/admin-retraining-tab").then(
			(m) => m.AdminRetrainingTab,
		),
	{ ssr: false },
);
const AdminStarterQuestions = dynamic(
	() =>
		import("@/components/admin-starter-questions").then(
			(m) => m.AdminStarterQuestions,
		),
	{ ssr: false },
);
const AdminSystemInstructions = dynamic(
	() =>
		import("@/components/admin-system-instructions").then(
			(m) => m.AdminSystemInstructions,
		),
	{ ssr: false },
);
const AdminEmbedCode = dynamic(
	() => import("@/components/admin-embed-code").then((m) => m.AdminEmbedCode),
	{ ssr: false },
);
const AdminWhatsAppTab = dynamic(
	() =>
		import("@/components/admin-whatsapp/admin-whatsapp-tab").then(
			(m) => m.AdminWhatsAppTab,
		),
	{ ssr: false },
);
const BillingSection = dynamic(
	() => import("@/components/billing-section").then((m) => m.BillingSection),
	{ ssr: false },
);

/**
 * useSearchParams suspends, so the export is a boundary and the hook lives in
 * the inner component. Without this Next.js fails the build with a missing
 * suspense boundary rather than a runtime error, which is the good outcome but
 * only if the boundary is actually here.
 */
export function AdminTabs() {
	return (
		<Suspense fallback={<div className="h-10" aria-hidden />}>
			<AdminTabsInner />
		</Suspense>
	);
}

function AdminTabsInner() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const raw = searchParams.get("tab");
	const active: TabValue = isTabValue(raw) ? raw : DEFAULT_TAB;

	const onTabChange = useCallback(
		(value: string) => {
			const params = new URLSearchParams(searchParams.toString());
			// The default tab is the bare URL. Writing ?tab=manual would make the
			// canonical address of the console depend on how you arrived at it.
			if (value === DEFAULT_TAB) params.delete("tab");
			else params.set("tab", value);
			const query = params.toString();
			// scroll: false — switching tabs is not navigation to a new page, and
			// jumping to the top loses the reader's place in a long Knowledge tab.
			router.replace(query ? `${pathname}?${query}` : pathname, {
				scroll: false,
			});
		},
		[pathname, router, searchParams],
	);

	return (
		<Tabs value={active} onValueChange={onTabChange} className="w-full">
			<TabsList className="flex w-full flex-wrap gap-1">
				<TabsTrigger value="manual" className="flex items-center gap-2">
					<Database className="h-4 w-4" />
					<span className="hidden sm:inline">Knowledge</span>
				</TabsTrigger>
				<TabsTrigger value="website" className="flex items-center gap-2">
					<Globe className="h-4 w-4" />
					<span className="hidden sm:inline">Website</span>
				</TabsTrigger>
				<TabsTrigger value="contacts" className="flex items-center gap-2">
					<Users className="h-4 w-4" />
					<span className="hidden sm:inline">Contacts</span>
				</TabsTrigger>
				<TabsTrigger value="playbooks" className="flex items-center gap-2">
					<Workflow className="h-4 w-4" />
					<span className="hidden sm:inline">Playbooks</span>
				</TabsTrigger>
				<TabsTrigger value="livechat" className="flex items-center gap-2">
					<Headphones className="h-4 w-4" />
					<span className="hidden sm:inline">Live Chat</span>
				</TabsTrigger>
				<TabsTrigger value="retraining" className="flex items-center gap-2">
					<RefreshCw className="h-4 w-4" />
					<span className="hidden sm:inline">Retraining</span>
				</TabsTrigger>
				<TabsTrigger value="settings" className="flex items-center gap-2">
					<Settings className="h-4 w-4" />
					<span className="hidden sm:inline">Settings</span>
				</TabsTrigger>
				<TabsTrigger value="prompts" className="flex items-center gap-2">
					<MessageSquare className="h-4 w-4" />
					<span className="hidden sm:inline">Instructions</span>
				</TabsTrigger>
				<TabsTrigger value="embed" className="flex items-center gap-2">
					<Code className="h-4 w-4" />
					<span className="hidden sm:inline">Embed</span>
				</TabsTrigger>
				{WHATSAPP_ENABLED && (
					<TabsTrigger value="whatsapp" className="flex items-center gap-2">
						<Phone className="h-4 w-4" />
						<span className="hidden sm:inline">WhatsApp</span>
					</TabsTrigger>
				)}
				<TabsTrigger value="billing" className="flex items-center gap-2">
					<CreditCard className="h-4 w-4" />
					<span className="hidden sm:inline">Billing</span>
				</TabsTrigger>
			</TabsList>

			<TabsContent value="manual" className="mt-6">
				<AdminKnowledgeBase />
			</TabsContent>

			<TabsContent value="website" className="mt-6">
				<AdminWebsiteScraping />
			</TabsContent>

			<TabsContent value="contacts" className="mt-6">
				<AdminContactsTab />
			</TabsContent>

			<TabsContent value="playbooks" className="mt-6">
				<AdminPlaybooksTab />
			</TabsContent>

			<TabsContent value="livechat" className="mt-6">
				<AdminLiveChatTab />
			</TabsContent>

			<TabsContent value="retraining" className="mt-6">
				<AdminRetrainingTab />
			</TabsContent>

			<TabsContent value="settings" className="mt-6">
				<AdminStarterQuestions />
			</TabsContent>

			<TabsContent value="prompts" className="mt-6">
				<AdminSystemInstructions />
			</TabsContent>

			<TabsContent value="embed" className="mt-6">
				<AdminEmbedCode />
			</TabsContent>

			{WHATSAPP_ENABLED && (
				<TabsContent value="whatsapp" className="mt-6">
					<AdminWhatsAppTab />
				</TabsContent>
			)}

			<TabsContent value="billing" className="mt-6">
				<BillingSection />
			</TabsContent>
		</Tabs>
	);
}
