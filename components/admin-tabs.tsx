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
import { AdminKnowledgeBase } from "@/components/admin-knowledge-base";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
	() =>
		import("@/components/admin-embed-code").then((m) => m.AdminEmbedCode),
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
	() =>
		import("@/components/billing-section").then((m) => m.BillingSection),
	{ ssr: false },
);

export function AdminTabs() {
	return (
		<Tabs defaultValue="manual" className="w-full">
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
				<TabsTrigger value="whatsapp" className="flex items-center gap-2">
					<Phone className="h-4 w-4" />
					<span className="hidden sm:inline">WhatsApp</span>
				</TabsTrigger>
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

			<TabsContent value="whatsapp" className="mt-6">
				<AdminWhatsAppTab />
			</TabsContent>

			<TabsContent value="billing" className="mt-6">
				<BillingSection />
			</TabsContent>
		</Tabs>
	);
}
