import mammoth from "mammoth";

export interface DOCXProcessorOptions {
	includeComments?: boolean;
	includeEndnotes?: boolean;
}

export interface DOCXProcessorResult {
	content: string;
	messages: Array<{ type: string; message: string }>;
}

/**
 * Process a DOCX file and extract text content
 */
export async function processDOCX(
	buffer: ArrayBuffer,
	options: DOCXProcessorOptions = {},
): Promise<DOCXProcessorResult> {
	const result = await mammoth.extractRawText({
		arrayBuffer: buffer,
	});

	return {
		content: result.value,
		messages: result.messages,
	};
}

/**
 * Process a DOCX file from a File object
 */
export async function processDOCXFile(
	file: File,
	options: DOCXProcessorOptions = {},
): Promise<DOCXProcessorResult> {
	const buffer = await file.arrayBuffer();
	return processDOCX(buffer, options);
}

/**
 * Process a DOCX file and convert to HTML (preserving some formatting)
 */
export async function processDOCXToHTML(buffer: ArrayBuffer): Promise<{
	html: string;
	messages: Array<{ type: string; message: string }>;
}> {
	const result = await mammoth.convertToHtml({
		arrayBuffer: buffer,
	});

	return {
		html: result.value,
		messages: result.messages,
	};
}

/**
 * Split DOCX content into chunks for embedding
 */
export function splitDOCXIntoChunks(
	content: string,
	chunkSize: number = 1000,
): string[] {
	// Split by paragraphs first
	const paragraphs = content.split(/\n\n+/);
	const chunks: string[] = [];
	let currentChunk = "";

	for (const paragraph of paragraphs) {
		// If single paragraph is too long, split by sentences
		if (paragraph.length > chunkSize) {
			const sentences = paragraph.split(/(?<=[.!?])\s+/);
			for (const sentence of sentences) {
				if (
					currentChunk.length + sentence.length > chunkSize &&
					currentChunk.length > 0
				) {
					chunks.push(currentChunk.trim());
					currentChunk = "";
				}
				currentChunk += `${sentence} `;
			}
		} else {
			if (
				currentChunk.length + paragraph.length > chunkSize &&
				currentChunk.length > 0
			) {
				chunks.push(currentChunk.trim());
				currentChunk = "";
			}
			currentChunk += `${paragraph}\n\n`;
		}
	}

	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	return chunks;
}
