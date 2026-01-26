import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { Documentation } from "@/components/documentation";

export const metadata: Metadata = {
	title: "Documentation - NY English Teacher AI Chatbot",
	description:
		"Complete documentation for the NY English Teacher AI Chatbot with RAG capabilities",
};

async function getDocumentation() {
	const docsDirectory = join(process.cwd(), "docs");

	try {
		const files = await readdir(docsDirectory);
		const mdFiles = files.filter((file) => file.endsWith(".md"));

		const docs = await Promise.all(
			mdFiles.map(async (file) => {
				const filePath = join(docsDirectory, file);
				const content = await readFile(filePath, "utf-8");

				// Extract title from first # heading
				const titleMatch = content.match(/^#\s+(.+)$/m);
				const title = titleMatch ? titleMatch[1] : file.replace(".md", "");

				// Extract slug from filename
				const slug = file.replace(/^\d+-/, "").replace(".md", "");

				return {
					slug,
					title,
					content,
					filename: file,
				};
			}),
		);

		// Sort by filename (which includes number prefix)
		docs.sort((a, b) => a.filename.localeCompare(b.filename));

		return docs;
	} catch (error) {
		console.error("Error reading documentation:", error);
		return [];
	}
}

export default async function DocumentationPage() {
	const docs = await getDocumentation();

	return <Documentation docs={docs} />;
}
