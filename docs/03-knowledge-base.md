# Knowledge Base Management

Learn how to add, update, and manage content in your chatbot's knowledge base.

## Admin Panel

Access the admin panel at `/admin` (requires authentication).

### Features

1. **Manual Content Entry** - Add content via textarea
2. **File Upload** - Upload `.txt`, `.md`, and `.pdf` files
3. **View Knowledge Base** - See all stored documents
4. **Delete Content** - Remove outdated information

## Adding Content Manually

### Via Admin UI

1. Navigate to `/admin`
2. Enter your content in the textarea
3. Set the content type (General Info, FAQ, Service, Pricing)
4. Select language (English or Spanish)
5. Add a source URL (optional)
6. Click "Add to Knowledge Base"

### Via API

```typescript
POST /api/admin/knowledge

{
  "content": "Your content here...",
  "url": "https://example.com",
  "metadata": {
    "type": "faq",
    "language": "en"
  }
}
```

The API will:

1. Generate an embedding for the content
2. Store it in the `Document_Knowledge` table
3. Make it immediately available for RAG

## File Upload

### Supported File Types

- **`.txt`** - Plain text files
- **`.md`** - Markdown files
- **`.pdf`** - PDF documents

### Upload Process

1. **Select files** - Click "Click to upload or drag and drop"
2. **Choose type and language** - Set metadata for all files
3. **Upload** - Files are processed automatically

### What Happens During Upload

#### Text/Markdown Files (Client-Side)

```typescript
1. Read file content in browser
2. Chunk text into ~1500 character pieces
3. Send each chunk to /api/admin/knowledge
4. Server generates embeddings and stores
```

#### PDF Files (Server-Side)

```typescript
1. Upload file to /api/admin/knowledge/pdf
2. Server extracts text using unpdf (primary) or pdf-parse (fallback)
3. Server chunks text
4. Server generates embeddings and stores
```

### PDF Processing Details

We use a **dual-parser strategy** for maximum compatibility:

**Primary: unpdf**

- Modern, TypeScript-native
- Fast and reliable
- Handles most PDFs

**Fallback: pdf-parse**

- Battle-tested (1.5M+ weekly downloads)
- Handles edge cases
- Automatic fallback if unpdf fails

### Upload Status Indicators

- **Uploading...** - Blue progress bar, file being processed
- **Complete** - Green progress bar, successfully added
- **Error** - Red progress bar with specific error message

### Error Messages

You'll see specific errors for:

- **Corrupted files** - "PDF file is empty or corrupted"
- **Password-protected** - "PDF parsing failed: password required"
- **Scanned images** - "No text content found (may need OCR)"
- **Unsupported format** - "Invalid file type"

## Content Types

### General Info

Business overview, services, coaching approach

**Example:**

```
This business offers personalized services for bilingual customers.
Sessions focus on clear communication, outcomes, and customer success.
```

### FAQ

Common questions and answers

**Example:**

```
Q: How long are the sessions?
A: Standard sessions are 60 minutes, with options for
30-minute quick reviews or 90-minute intensive sessions.
```

### Service

Specific offerings and their details

**Example:**

```
Business English Coaching: One-on-one sessions tailored to
your industry. Covers presentations, negotiations, email
writing, and professional vocabulary.
```

### Pricing

Cost information and payment details

**Example:**

```
Session rates: 500 MXN or 25 USD per hour. Package discounts
available for 10+ sessions. First consultation is free.
```

## Best Practices

### Content Guidelines

1. **Be Specific** - Include details like prices, schedules, contact info
2. **Use Clear Language** - Avoid jargon or ambiguous terms
3. **Keep It Current** - Update pricing and availability regularly
4. **Chunk Appropriately** - Break long documents into logical sections
5. **Add Context** - Include relevant metadata (type, language, source)

### Bilingual Content

For bilingual support:

- Add English version with `language: "en"`
- Add Spanish version with `language: "es"`
- Use consistent terminology across languages

**Example:**

```typescript
// English
{
  content: "Sessions are 500 MXN per hour",
  metadata: { type: "pricing", language: "en" }
}

// Spanish
{
  content: "Las sesiones cuestan 500 MXN por hora",
  metadata: { type: "pricing", language: "es" }
}
```

### Optimal Chunk Size

- **Too small** (<500 chars) - Lacks context
- **Optimal** (1000-1500 chars) - Good balance
- **Too large** (>2000 chars) - Loses specificity

The system automatically chunks files, but for manual entry:

- Aim for 1-2 paragraphs per entry
- Include complete thoughts
- Don't split mid-sentence

## Viewing Knowledge Base

### Via Admin Panel

Navigate to `/admin` and scroll to "Current Knowledge Base" section.

### Via API

```typescript
GET /api/admin/knowledge

Response:
[
  {
    "id": 1,
    "content": "...",
    "url": "...",
    "metadata": { "type": "faq", "language": "en" },
    "createdAt": "2024-11-22T08:00:00Z"
  },
  ...
]
```

## Deleting Content

### Via Admin Panel

1. Find the document in the list
2. Click the delete button
3. Confirm deletion

### Via API

```typescript
DELETE /api/admin/knowledge?id=123
```

## Populating from Script

For bulk content, use the seed script:

```bash
npx tsx scripts/populate-knowledge.ts
```

Edit `scripts/populate-knowledge.ts` to add your content:

```typescript
await addDocument("Your content here...", "https://source-url.com", {
  type: "faq",
  language: "en",
});
```

## Troubleshooting

### Content Not Appearing in Responses

1. **Check similarity threshold** - Content may not be relevant enough
2. **Verify embedding** - Ensure embedding was generated
3. **Test search** - Use the search tool directly
4. **Check language** - Ensure language matches user query

### PDF Upload Fails

1. **Check file size** - Very large PDFs may timeout
2. **Verify format** - Some PDFs are scanned images (need OCR)
3. **Check logs** - Look for `[PDF Upload]` messages in terminal
4. **Try fallback** - System automatically tries both parsers

### Duplicate Content

To avoid duplicates:

- Delete old content before re-uploading
- Use unique URLs as identifiers
- Check existing content before adding

## Next Steps

- [Learn about file upload internals](./04-file-upload.md)
- [Customize system prompts](./05-customization.md)
- [Read the FAQ](./06-faq.md)
