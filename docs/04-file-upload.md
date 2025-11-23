# File Upload System

Deep dive into the file upload and processing system for the knowledge base.

## Overview

The file upload system supports `.txt`, `.md`, and `.pdf` files with automatic text extraction, chunking, and embedding generation.

## Architecture

### Client-Side Processing (`.txt`, `.md`)

**Component:** `components/admin-knowledge-base.tsx`

```typescript
const handleFileUpload = async (event) => {
  const files = event.target.files;

  for (const file of files) {
    if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      // 1. Read file in browser
      const text = await file.text();

      // 2. Chunk text
      const chunks = chunkText(text);

      // 3. Send each chunk to API
      for (const chunk of chunks) {
        await fetch("/api/admin/knowledge", {
          method: "POST",
          body: JSON.stringify({
            content: chunk,
            metadata: { sourceFile: file.name },
          }),
        });
      }
    }
  }
};
```

**Why client-side?**

- Text files are small and safe to read in browser
- Reduces server load
- Faster processing (no upload wait)
- Immediate feedback to user

### Server-Side Processing (`.pdf`)

**API Route:** `app/api/admin/knowledge/pdf/route.ts`

```typescript
export async function POST(request: Request) {
  // 1. Receive file upload
  const formData = await request.formData();
  const file = formData.get("file") as File;

  // 2. Convert to Buffer and Uint8Array
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const buffer = Buffer.from(arrayBuffer);

  // 3. Extract text (dual-parser strategy)
  let text: string;
  try {
    // Try unpdf first
    const result = await extractText(uint8Array);
    text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
  } catch (unpdfError) {
    // Fallback to pdf-parse
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    text = data.text;
  }

  // 4. Chunk text
  const chunks = chunkText(text);

  // 5. Generate embeddings and store
  for (const chunk of chunks) {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: chunk,
    });

    await db.insert(documents).values({
      content: chunk,
      embedding: embedding,
      metadata: JSON.stringify({ sourceFile: file.name }),
    });
  }
}
```

**Why server-side?**

- PDFs require native libraries (pdf-parse, unpdf)
- Binary processing needs Node.js Buffer
- Security (validate files server-side)
- Consistent environment

## Dual-Parser Strategy

### Primary: unpdf

**Advantages:**

- Modern, TypeScript-native
- Clean async/await API
- Fast and efficient
- Good error messages

**Usage:**

```typescript
import { extractText } from "unpdf";

const result = await extractText(uint8Array);
const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
```

### Fallback: pdf-parse

**Advantages:**

- Battle-tested (1.5M+ weekly downloads)
- Handles edge cases
- Wide PDF format support
- Reliable for complex PDFs

**Usage:**

```typescript
const pdfParse = require("pdf-parse");
const data = await pdfParse(buffer);
const text = data.text;
```

### Why Both?

Different PDFs have different quirks:

- **unpdf** handles modern, well-formed PDFs
- **pdf-parse** handles legacy formats, scanned documents, complex layouts
- Automatic fallback ensures maximum compatibility

## Text Chunking

### Algorithm

```typescript
function chunkText(text: string, maxLength = 1500) {
  const chunks: string[] = [];
  let current = text.trim();

  while (current.length > maxLength) {
    // Try to split at paragraph breaks
    let splitIndex = current.lastIndexOf("\n\n", maxLength);

    // If no paragraph break, split at maxLength
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    const chunk = current.slice(0, splitIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    current = current.slice(splitIndex).trim();
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}
```

### Chunking Strategy

1. **Prefer paragraph breaks** - Split at `\n\n` when possible
2. **Respect max length** - Default 1500 characters
3. **Preserve context** - Don't split mid-sentence if avoidable
4. **Trim whitespace** - Clean up each chunk

### Why 1500 Characters?

- **Embedding quality** - Optimal for semantic meaning
- **Context window** - Fits well in GPT-4o context
- **Retrieval precision** - Specific enough to be useful
- **Performance** - Fast to process and search

## Error Handling

### Validation Layers

```typescript
// 1. File type validation
if (!file.name.toLowerCase().endsWith(".pdf")) {
  return Response.json(
    { error: "Invalid file type. Only PDF files are supported." },
    { status: 400 }
  );
}

// 2. Empty file check
if (buffer.length === 0) {
  return Response.json(
    { error: "PDF file is empty or corrupted" },
    { status: 400 }
  );
}

// 3. Text extraction validation
if (!text || text.trim().length === 0) {
  return Response.json(
    {
      error:
        "No text content found in PDF. The file may be scanned images without OCR.",
    },
    { status: 400 }
  );
}
```

### Error Messages

Specific, actionable error messages for users:

| Error        | Message                                            | Action               |
| ------------ | -------------------------------------------------- | -------------------- |
| Wrong type   | "Invalid file type. Only PDF files are supported." | Upload .pdf file     |
| Empty file   | "PDF file is empty or corrupted"                   | Check file integrity |
| No text      | "No text content found (may need OCR)"             | Use OCR tool first   |
| Parse failed | "PDF parsing failed: [details]"                    | Check file format    |
| Password     | "The file may be password-protected"               | Remove password      |

### Client-Side Error Display

```typescript
// Parse error from API
if (!response.ok) {
  let errorMessage = `Failed to add content from ${file.name}`;
  try {
    const errorData = await response.json();
    if (errorData.error) {
      errorMessage = errorData.error;
    }
  } catch (e) {
    // Use default message
  }

  // Update UI with error
  setUploadItems((prev) =>
    prev.map((item) =>
      item.name === file.name
        ? { ...item, status: "error", errorMessage }
        : item
    )
  );

  // Show toast
  toast.error(errorMessage);
}
```

## Upload Status UI

### Status Types

```typescript
type UploadItem = {
  name: string;
  size: number;
  status: "uploading" | "complete" | "error";
  errorMessage?: string;
};
```

### Visual Indicators

**Uploading:**

- Blue progress bar (animated pulse)
- "Uploading..." text
- 50% progress indicator

**Complete:**

- Green progress bar (100%)
- "Complete" text
- Checkmark icon

**Error:**

- Red progress bar (33%)
- "Error" text
- Error message displayed below

## Debug Logging

### Server-Side Logs

```typescript
console.log(`[PDF Upload] Processing ${file.name} (${buffer.length} bytes)`);
console.log("[PDF Upload] Attempting extraction with unpdf...");
console.log(
  `[PDF Upload] unpdf succeeded, extracted ${text.length} characters`
);
console.warn("[PDF Upload] unpdf failed, falling back to pdf-parse:", error);
console.log(
  `[PDF Upload] pdf-parse succeeded, extracted ${text.length} characters`
);
console.error("[PDF Upload] Both parsers failed:", error);
```

### What to Look For

1. **File size** - Is the file being received?
2. **Parser used** - Which parser succeeded?
3. **Text length** - How much text was extracted?
4. **Errors** - What specifically failed?

## Performance Optimization

### Client-Side

- Process files in parallel (up to browser limit)
- Show progress for each file independently
- Cancel uploads if user navigates away

### Server-Side

- Stream large files instead of loading entirely
- Chunk processing to avoid memory spikes
- Batch embedding generation when possible

### Database

- Index on `embedding` column for fast search
- Use connection pooling
- Batch inserts for multiple chunks

## Security Considerations

### File Validation

- Check file extensions
- Validate MIME types
- Limit file sizes (prevent DoS)
- Scan for malicious content

### Authentication

- Require auth for `/admin` routes
- Verify session before processing uploads
- Rate limit upload endpoints

### Sanitization

- Escape special characters in filenames
- Validate metadata fields
- Prevent SQL injection in queries

## Testing File Upload

### Manual Testing

1. **Text file** - Create `test.txt` with sample content
2. **Markdown file** - Create `test.md` with formatted text
3. **PDF file** - Use a real PDF document

### Test Cases

- ✅ Small file (<1KB)
- ✅ Medium file (100KB)
- ✅ Large file (5MB)
- ✅ Corrupted file
- ✅ Password-protected PDF
- ✅ Scanned PDF (images only)
- ✅ Multiple files at once
- ✅ Duplicate uploads

### Expected Behavior

| Test Case  | Expected Result                       |
| ---------- | ------------------------------------- |
| Valid PDF  | "Complete" status, text extracted     |
| Corrupted  | "Error" with specific message         |
| Password   | "Error: password-protected"           |
| Scanned    | "Error: no text content (OCR needed)" |
| Large file | Progress indicator, eventual success  |

## Next Steps

- [Customize system prompts](./05-customization.md)
- [Read the FAQ](./06-faq.md)
- [Learn about RAG architecture](./02-rag-architecture.md)
