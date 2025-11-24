import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import * as cheerio from "cheerio";
import { config as dotenvConfig } from "dotenv";
import postgres from "postgres";
import { parseStringPromise } from "xml2js";

// Load environment variables
dotenvConfig({ path: ".env.development.local" });
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);

const CONFIG = {
  sitemapUrl: "https://www.nyenglishteacher.com/sitemap-0.xml",
  tableName: "website_content",
  chunkSize: 1000,
  chunkOverlap: 200,
  // Include BOTH English and Spanish pages
  filterPattern: /^https:\/\/www\.nyenglishteacher\.com\/(en\/|es\/|$)/,
};

interface PageData {
  url: string;
  title: string;
  description: string;
  content: string;
}

interface Chunk {
  content: string;
  metadata: {
    url: string;
    title: string;
    description: string;
    source: string;
    scraped_at: string;
    chunk_index: number;
  };
}

async function fetchSitemapUrls(): Promise<string[]> {
  console.log("📥 Fetching sitemap...");
  
  try {
    const response = await fetch(CONFIG.sitemapUrl);
    
    if (!response.ok) {
      console.warn(`⚠️  Sitemap not found at ${CONFIG.sitemapUrl}, using fallback URLs`);
      return getFallbackUrls();
    }

    const xmlText = await response.text();
    
    // Debug: Log first 500 chars to see what we got
    console.log("📄 Sitemap preview:", xmlText.substring(0, 500));

    const result = await parseStringPromise(xmlText);

    const urls: string[] = [];
    if (result.urlset && result.urlset.url) {
      for (const entry of result.urlset.url) {
        if (entry.loc && entry.loc[0]) {
          const url = entry.loc[0];
          // Filter to only English pages
          if (CONFIG.filterPattern.test(url)) {
            urls.push(url);
          }
        }
      }
    }

    console.log(`✅ Found ${urls.length} English URLs in sitemap`);
    return urls.length > 0 ? urls : getFallbackUrls();
  } catch (error) {
    console.warn("⚠️  Failed to parse sitemap, using fallback URLs");
    return getFallbackUrls();
  }
}

function getFallbackUrls(): string[] {
  // Fallback to known pages if sitemap doesn't exist
  const urls = [
    "https://www.nyenglishteacher.com/",
    "https://www.nyenglishteacher.com/en/about",
    "https://www.nyenglishteacher.com/en/services/",
    "https://www.nyenglishteacher.com/en/blog/",
    "https://www.nyenglishteacher.com/en/contact",
  ];
  console.log(`📋 Using ${urls.length} fallback URLs`);
  return urls;
}

async function scrapePage(url: string): Promise<PageData | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`⚠️  Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Clean up common clutter
    $("script, style, nav, footer, iframe, noscript").remove();

    const title = $("title").text().trim();
    const description = $('meta[name="description"]').attr("content") || "";
    const content = $("body").text().replace(/\s+/g, " ").trim();

    return { url, title, description, content };
  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error);
    return null;
  }
}

function splitIntoChunks(page: PageData): Chunk[] {
  const chunks: Chunk[] = [];
  const { content, url, title, description } = page;

  // Simple character-based splitting with overlap
  let start = 0;
  let chunkIndex = 0;

  while (start < content.length) {
    const end = Math.min(start + CONFIG.chunkSize, content.length);
    const chunkContent = content.slice(start, end);

    // Detect language from URL
    const language = url.includes('/es/') ? 'es' : 'en';
    
    chunks.push({
      content: chunkContent,
      metadata: {
        url,
        title,
        description,
        source: "website",
        scraped_at: new Date().toISOString(),
        chunk_index: chunkIndex,
      },
    });

    start += CONFIG.chunkSize - CONFIG.chunkOverlap;
    chunkIndex++;
  }

  return chunks;
}

async function storeChunk(chunk: Chunk): Promise<void> {
  try {
    // Create embedding using AI SDK
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: chunk.content,
    });

    // Insert into database using raw SQL
    await client`
      INSERT INTO ${client(CONFIG.tableName)} (content, metadata, embedding, url, created_at)
      VALUES (
        ${chunk.content},
        ${JSON.stringify(chunk.metadata)},
        ${JSON.stringify(embedding)},
        ${chunk.metadata.url},
        NOW()
      )
    `;
  } catch (error) {
    console.error(`❌ Failed to store chunk:`, error);
    throw error;
  }
}

async function ingestWebsite() {
  console.log("🚀 Starting ingestion pipeline...\n");

  try {
    // 1. Fetch sitemap URLs
    const urls = await fetchSitemapUrls();

    // 2. Clear existing data (idempotency)
    console.log("🧹 Clearing old data...");
    await client`TRUNCATE TABLE ${client(CONFIG.tableName)}`;
    console.log("✅ Table cleared\n");

    // 3. Scrape, chunk, and store each page
    let totalChunks = 0;
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[${i + 1}/${urls.length}] Processing: ${url}`);

      const pageData = await scrapePage(url);
      if (!pageData) continue;

      const chunks = splitIntoChunks(pageData);
      console.log(`  📄 Generated ${chunks.length} chunks`);

      for (const chunk of chunks) {
        await storeChunk(chunk);
      }

      totalChunks += chunks.length;
      console.log(`  ✅ Stored ${chunks.length} chunks\n`);
    }

    console.log(`🎉 Ingestion complete! Total chunks: ${totalChunks}`);
  } catch (error) {
    console.error("❌ Ingestion failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the ingestion
ingestWebsite().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
