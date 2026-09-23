"use client";

import { Database, Globe, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
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

export function AdminWebsiteScraping() {
	const [isIngesting, setIsIngesting] = useState(false);
	/**
	 * Empty, with the example only as a placeholder.
	 *
	 * This field used to be PRE-FILLED with a real sitemap belonging to an
	 * unrelated business, one "Run Ingestion" click away from scraping that
	 * company's site into whichever tenant happened to be signed in. It also made
	 * the dashboard read as broken on first sight — another company's domain
	 * sitting in your input is indistinguishable from your data being wrong.
	 */
	const [sitemapUrl, setSitemapUrl] = useState("");
	const [stats, setStats] = useState<{
		websiteContent: number;
		manualContent: number;
	} | null>(null);
	const [isLoadingStats, setIsLoadingStats] = useState(false);

	const loadStats = async () => {
		setIsLoadingStats(true);
		try {
			const response = await fetch("/api/admin/knowledge/stats");
			if (!response.ok) throw new Error("Failed to load stats");
			const data = await response.json();
			setStats(data);
		} catch (error) {
			console.error("Error loading stats:", error);
			toast.error("Failed to load knowledge base stats");
		} finally {
			setIsLoadingStats(false);
		}
	};

	const handleRunIngestion = async () => {
		if (!sitemapUrl.trim()) {
			toast.error("Please enter a sitemap URL");
			return;
		}

		setIsIngesting(true);
		toast.info("Starting website ingestion... This may take a few minutes.");

		try {
			const response = await fetch("/api/admin/knowledge/ingest", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sitemapUrl: sitemapUrl.trim(),
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to run ingestion");
			}

			const result = await response.json();
			toast.success(
				`Ingestion complete! Processed ${result.pagesProcessed} pages, created ${result.chunksCreated} chunks.`,
			);

			// Reload stats
			await loadStats();
		} catch (error) {
			console.error("Error running ingestion:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to run ingestion",
			);
		} finally {
			setIsIngesting(false);
		}
	};

	const handleClearWebsiteContent = async () => {
		if (
			!confirm(
				"Clear all scraped website content for this account? Pages added by ingestion will be deleted. Content you entered by hand on the Knowledge tab is not affected, and you can re-run ingestion at any time.",
			)
		) {
			return;
		}

		try {
			const response = await fetch("/api/admin/knowledge/clear-website", {
				method: "DELETE",
			});

			if (!response.ok) throw new Error("Failed to clear website content");

			toast.success("Website content cleared successfully");
			await loadStats();
		} catch (error) {
			console.error("Error clearing website content:", error);
			toast.error("Failed to clear website content");
		}
	};

	return (
		<div className="space-y-6">
			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Website Content
						</CardTitle>
						<Globe className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoadingStats ? (
								<Loader2 className="h-6 w-6 animate-spin" />
							) : stats ? (
								`${stats.websiteContent} chunks`
							) : (
								"—"
							)}
						</div>
						<p className="text-xs text-muted-foreground">
							Scraped from sitemap
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Manual Content
						</CardTitle>
						<Database className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoadingStats ? (
								<Loader2 className="h-6 w-6 animate-spin" />
							) : stats ? (
								`${stats.manualContent} items`
							) : (
								"—"
							)}
						</div>
						<p className="text-xs text-muted-foreground">
							Uploaded files & text
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Load Stats Button */}
			{!stats && (
				<Button
					onClick={loadStats}
					disabled={isLoadingStats}
					variant="outline"
					className="w-full"
				>
					{isLoadingStats ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Loading...
						</>
					) : (
						<>
							<RefreshCw className="mr-2 h-4 w-4" />
							Load Knowledge Base Stats
						</>
					)}
				</Button>
			)}

			{/* Website Scraping Card */}
			<Card>
				<CardHeader>
					<CardTitle>Website Scraping</CardTitle>
					<CardDescription>
						Automatically scrape and index content from your website using a
						sitemap, and add every page it finds to this account&apos;s
						knowledge.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="sitemap-url">Sitemap URL</Label>
						<Input
							id="sitemap-url"
							type="url"
							placeholder="https://www.example.com/sitemap.xml"
							value={sitemapUrl}
							onChange={(e) => setSitemapUrl(e.target.value)}
							disabled={isIngesting}
						/>
						<p className="text-sm text-muted-foreground">
							Enter the URL of your XML sitemap. The system will scrape all
							pages, chunk the content, create embeddings, and store them for
							semantic search.
						</p>
					</div>

					<div className="flex gap-2">
						<Button
							onClick={handleRunIngestion}
							disabled={isIngesting}
							className="flex-1"
						>
							{isIngesting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Ingesting...
								</>
							) : (
								<>
									<RefreshCw className="mr-2 h-4 w-4" />
									Run Ingestion
								</>
							)}
						</Button>

						{stats && stats.websiteContent > 0 && (
							<Button
								onClick={handleClearWebsiteContent}
								disabled={isIngesting}
								variant="destructive"
							>
								Clear Website Data
							</Button>
						)}
					</div>

					{isIngesting && (
						<div className="rounded-lg bg-muted p-4 text-sm">
							<p className="font-medium mb-2">Ingestion in progress...</p>
							<p className="text-muted-foreground">This process will:</p>
							<ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
								<li>Fetch and parse the sitemap</li>
								<li>Scrape content from each page</li>
								<li>Split content into searchable chunks</li>
								<li>Generate embeddings using OpenAI</li>
								<li>Store in the database with vector indexes</li>
							</ul>
							<p className="text-muted-foreground mt-2">
								Please wait... This may take several minutes depending on the
								number of pages.
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Info Card */}
			<Card>
				<CardHeader>
					<CardTitle>How It Works</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm text-muted-foreground">
					<p>
						<strong>Scraped pages.</strong> Ingestion reads your sitemap,
						fetches up to 20 pages, splits each into ~1,000-character passages
						and stores them for this account only. Re-running it skips passages
						that have not changed, so a re-ingest after a small edit is cheap.
					</p>
					<p>
						<strong>Manually added content.</strong> Anything you enter on the
						Knowledge tab is stored the same way and searched together with the
						scraped pages — there is no priority order between them. The
						assistant simply uses the closest matches to the question it was
						asked.
					</p>
					<p>
						<strong>Scraping and written answers do different jobs.</strong>{" "}
						Scraped pages give broad coverage cheaply, and they match
						descriptive questions well — a visitor asking &quot;what does{" "}
						{"{your company}"} cost?&quot; lands on the scraped pricing page
						reliably. Terse questions are where they weaken: &quot;how
						much?&quot; is a short phrase and a scraped paragraph is a long one,
						and the two are less similar than you would expect even when the
						paragraph holds the answer. So scrape for coverage, and write short
						answers on the Knowledge tab for the handful of facts you cannot
						afford to have missed — prices, hours, policies.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
