import Papa from "papaparse";

export interface CSVProcessorOptions {
	includeHeaders?: boolean;
	maxRows?: number;
	rowTemplate?: string;
}

export interface CSVProcessorResult {
	content: string;
	rowCount: number;
	headers: string[];
}

/**
 * Process a CSV file and convert it to natural language chunks
 */
export async function processCSV(
	fileContent: string,
	options: CSVProcessorOptions = {},
): Promise<CSVProcessorResult> {
	const { includeHeaders = true, maxRows, rowTemplate } = options;

	const parsed = Papa.parse<Record<string, string>>(fileContent, {
		header: true,
		skipEmptyLines: true,
	});

	if (parsed.errors.length > 0) {
		console.warn("CSV parsing warnings:", parsed.errors);
	}

	const headers = parsed.meta.fields || [];
	const rows = maxRows ? parsed.data.slice(0, maxRows) : parsed.data;

	// Convert rows to natural language
	const contentLines: string[] = [];

	if (includeHeaders) {
		contentLines.push(
			`This data contains the following columns: ${headers.join(", ")}.`,
		);
		contentLines.push("");
	}

	for (const row of rows) {
		if (rowTemplate) {
			// Use custom template
			let line = rowTemplate;
			for (const header of headers) {
				line = line.replace(`{{${header}}}`, row[header] || "");
			}
			contentLines.push(line);
		} else {
			// Default: convert row to natural language
			const parts = headers.filter((h) => row[h]).map((h) => `${h}: ${row[h]}`);
			contentLines.push(`${parts.join(", ")}.`);
		}
	}

	return {
		content: contentLines.join("\n"),
		rowCount: rows.length,
		headers,
	};
}

/**
 * Process a CSV file from a File object
 */
export async function processCSVFile(
	file: File,
	options: CSVProcessorOptions = {},
): Promise<CSVProcessorResult> {
	const text = await file.text();
	return processCSV(text, options);
}

/**
 * Split CSV content into chunks for embedding
 */
export function splitCSVIntoChunks(
	result: CSVProcessorResult,
	chunkSize: number = 1000,
): string[] {
	const lines = result.content.split("\n");
	const chunks: string[] = [];
	let currentChunk = "";

	for (const line of lines) {
		if (
			currentChunk.length + line.length > chunkSize &&
			currentChunk.length > 0
		) {
			chunks.push(currentChunk.trim());
			currentChunk = "";
		}
		currentChunk += `${line}\n`;
	}

	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	return chunks;
}
