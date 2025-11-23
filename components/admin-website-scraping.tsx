"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Globe, RefreshCw, Database } from "lucide-react";

export function AdminWebsiteScraping() {
  const [isIngesting, setIsIngesting] = useState(false);
  const [sitemapUrl, setSitemapUrl] = useState(
    "https://www.nyenglishteacher.com/sitemap-0.xml"
  );
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
        `Ingestion complete! Processed ${result.pagesProcessed} pages, created ${result.chunksCreated} chunks.`
      );
      
      // Reload stats
      await loadStats();
    } catch (error) {
      console.error("Error running ingestion:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to run ingestion"
      );
    } finally {
      setIsIngesting(false);
    }
  };

  const handleClearWebsiteContent = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all website content? This will delete all scraped data from the website_content table."
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
            sitemap. This will populate the website_content table used for RAG.
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
              <p className="text-muted-foreground">
                This process will:
              </p>
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
            <strong>Website Content (website_content table):</strong> Automatically
            scraped from your sitemap. Used for answering questions about your
            website content.
          </p>
          <p>
            <strong>Manual Content (Document_Knowledge table):</strong> Content
            you manually add via the forms above. Use this for information not
            on your website.
          </p>
          <p>
            <strong>Search Priority:</strong> The chatbot searches website
            content first, then falls back to manual content if no results are
            found.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
