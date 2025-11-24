# Chatbot Embed Widget Documentation

## Overview

The embed widget allows you to add the NY English Teacher chatbot to any website with a simple script tag. It provides a floating chat bubble that opens a full-featured chat interface in an iframe.

---

## Features

- ✅ **Plug-and-play** - No authentication required for end users
- ✅ **Self-contained** - Runs independently from main app
- ✅ **Customizable** - Colors, icons, messages configurable via data attributes
- ✅ **Bilingual** - Supports English and Spanish
- ✅ **Markdown rendering** - Formats bot responses with proper styling
- ✅ **Knowledge base integration** - Searches both scraped and manual content
- ✅ **Modern UI** - Clean, professional design with smooth animations

---

## Installation

### Basic Usage

Add this script tag to any HTML page:

```html
<script
  src="https://your-domain.com/api/embed"
  data-language="en"
  data-button-color="#2563eb"
  data-welcome-message="Hello! How can I help you today?"
  data-placeholder="Type your message..."
  data-bot-icon="🎓"
  async
></script>
```

### Configuration Options

| Attribute              | Description                                       | Default                        |
| ---------------------- | ------------------------------------------------- | ------------------------------ |
| `data-language`        | Interface language (`en` or `es`)                 | `en`                           |
| `data-button-color`    | Hex color for chat bubble                         | `#2563eb`                      |
| `data-button-size`     | Scale factor for bubble (0.8-1.2)                 | `1.0`                          |
| `data-position`        | Bubble position (`bottom-right` or `bottom-left`) | `bottom-right`                 |
| `data-welcome-message` | Initial greeting message                          | `"Hello! How can I help you?"` |
| `data-placeholder`     | Input field placeholder text                      | `"Type your message..."`       |
| `data-bot-icon`        | Emoji or text for bot avatar                      | `🎓`                           |

---

## Architecture

### File Structure

```
app/
├── api/
│   └── embed/
│       ├── route.ts          # Embed script generator
│       └── chat/
│           └── route.ts      # Anonymous chat API
├── embed/
│   └── chat/
│       └── page.tsx          # Chat interface (iframe content)
├── demo/
│   └── page.tsx              # SaaS product demo page
└── demo-ny-english/
    └── page.tsx              # NY English Teacher demo
```

### How It Works

1. **Script Loading** (`/api/embed`)

   - Generates JavaScript that creates the chat bubble
   - Reads configuration from data attributes
   - Injects button and iframe into host page

2. **Chat Interface** (`/embed/chat`)

   - Self-contained React component
   - Manages its own state (no auth, no database)
   - Uses `nanoid()` for unique session IDs
   - Renders markdown with `react-markdown`

3. **Chat API** (`/api/embed/chat`)
   - Anonymous endpoint (no authentication)
   - Searches knowledge base using vector similarity
   - Detects language and translates URLs
   - Generates responses using AI model

---

## Knowledge Base Integration

### Dual-Source Search

The chatbot searches **two knowledge sources** simultaneously:

1. **`website_content`** - Scraped from nyenglishteacher.com sitemap
2. **`Document_Knowledge`** - Manually added via admin panel

### Search Process

```typescript
// 1. Generate embedding for user query
const embedding = await embed({
  model: openai.embedding("text-embedding-3-small"),
  value: query,
});

// 2. Search both tables with cosine similarity
const websiteResults = await db.query(`
  SELECT content, url, similarity
  FROM website_content
  WHERE similarity > 0.5
  LIMIT 5
`);

const manualResults = await db.query(`
  SELECT content, url, similarity
  FROM "Document_Knowledge"
  WHERE similarity > 0.5
  LIMIT 5
`);

// 3. Merge and sort by similarity
const allResults = [...websiteResults, ...manualResults]
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 5);
```

### Why This Matters

**Before the merge:**

- Only searched `Document_Knowledge` if `website_content` had ZERO results
- Manual admin entries were ignored if ANY website results existed
- Led to incomplete or missing information

**After the merge:**

- Searches BOTH sources simultaneously
- Returns top 5 results regardless of source
- Ensures manually added content is always considered

---

## Styling & UI

### User Messages

- **Background:** Blue (`#2563eb`)
- **Text:** Pure white (`#ffffff`)
- **Position:** Right-aligned
- **Style:** Rounded corners, shadow

### Bot Messages

- **Background:** White
- **Text:** Dark gray
- **Position:** Left-aligned
- **Style:** Border, rounded corners

### Markdown Support

The chat supports:

- **Bold text** with `**text**`
- _Italic text_ with `*text*`
- Links with `[text](url)`
- Bullet lists with `-` or `*`
- Numbered lists with `1.`, `2.`, etc.

All markdown elements inherit proper text color based on message role.

---

## Development Notes

### Next.js Dev Tools

In development mode, Next.js shows error overlays and toast notifications. These are:

- ✅ **Normal** - Only appear in development
- ✅ **Helpful** - Show errors and warnings
- ✅ **Automatic** - Removed in production builds

**Do not try to hide them with CSS** - they won't exist in production anyway.

### Hydration Warnings

You may see warnings like:

```
A tree hydrated but some attributes of the server rendered HTML didn't match
```

These are typically caused by:

- Browser extensions (Grammarly, etc.)
- Date/time rendering
- Random values in SSR

They are **harmless** and won't affect functionality.

### Server vs. Client Components

- **`/api/embed/route.ts`** - Server-side (generates script)
- **`/embed/chat/page.tsx`** - Client component (`"use client"`)
- **`/demo/page.tsx`** - SaaS product showcase
- **`/demo-ny-english/page.tsx`** - Client-specific demo

Never use client-only features (like `styled-jsx`) in server components.

---

## Testing

### Local Testing

1. Start dev server:

   ```bash
   pnpm run dev
   ```

2. Visit demo page:

   ```
   http://localhost:3000/demo
   http://localhost:3000/demo-ny-english
   ```

3. Test features:
   - Click chat bubble to open
   - Send messages and verify responses
   - Check markdown rendering
   - Test knowledge base queries
   - Verify language detection

### Production Testing

1. Build the app:

   ```bash
   pnpm run build
   ```

2. Start production server:

   ```bash
   pnpm run start
   ```

3. Verify:
   - No dev tools appear
   - Chat functions correctly
   - Knowledge base searches work
   - UI is clean and professional

---

## Common Issues & Solutions

### Issue: "Module not found: globals.css"

**Cause:** CSS file was deleted but import remains

**Solution:** Remove the import from the component:

```typescript
// Remove this line:
import "./globals.css";
```

### Issue: "styled-jsx error in Server Component"

**Cause:** Using client-side CSS in a server component

**Solution:** Either:

1. Remove the `<style jsx>` block, or
2. Add `"use client"` directive at top of file

### Issue: Bot doesn't find manually added content

**Cause:** Search only checked `website_content` table

**Solution:** Merge both knowledge sources (already implemented):

```typescript
const allResults = [...websiteResults, ...manualResults]
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 5);
```

### Issue: Text not visible on blue background

**Cause:** CSS inheritance not forcing white color

**Solution:** Use inline styles with explicit color:

```typescript
style={msg.role === "user" ? { color: "#ffffff" } : {}}
```

---

## Future Enhancements

### Planned Features

1. **Admin Customization Panel**

   - Visual color picker
   - Logo/icon uploader
   - Preview in real-time
   - Generate embed code

2. **Analytics**

   - Track chat opens
   - Monitor message volume
   - Analyze common questions

3. **Advanced Styling**

   - Custom CSS injection
   - Theme presets
   - Mobile responsiveness tweaks

4. **Rate Limiting**
   - Prevent abuse
   - Track by IP or session
   - Configurable limits

---

## API Reference

### POST `/api/embed/chat`

Anonymous chat endpoint for embed widget.

**Request:**

```json
{
  "message": "What are your services?"
}
```

**Response:**

```json
{
  "response": "NY English Teacher offers several services including..."
}
```

**Error Response:**

```json
{
  "error": "Failed to process message"
}
```

### GET `/api/embed`

Generates the embed script with configuration.

**Query Parameters:** None (reads from script tag data attributes)

**Returns:** JavaScript code that creates the chat widget

---

## Security Considerations

### Anonymous Access

The embed widget does **not require authentication**. This is intentional for ease of use, but means:

- ✅ Anyone can use the chat
- ⚠️ No user tracking or history
- ⚠️ Potential for abuse (implement rate limiting)

### Rate Limiting (TODO)

Recommended implementation:

```typescript
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});

// In API route:
const { success } = await ratelimit.limit(ip);
if (!success) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

### Data Privacy

- No personal data is stored
- Chat sessions are ephemeral (in-memory only)
- Knowledge base content is public
- No cookies or tracking

---

## Maintenance

### Updating Knowledge Base

**Via Admin Panel:**

1. Go to `/admin`
2. Click "Knowledge Base" tab
3. Add content manually or load from sitemap
4. Content is immediately searchable

**Via Sitemap:**

1. Ensure sitemap is properly formatted XML
2. Use admin panel to load from URL
3. Script will scrape and embed all pages

### Monitoring

Check these regularly:

- API response times
- Knowledge base search quality
- Error logs in production
- User feedback on chat quality

---

## Credits

Built with:

- **Next.js 15** - React framework
- **Vercel AI SDK** - AI model integration
- **OpenAI** - Embeddings and chat models
- **PostgreSQL + pgvector** - Vector similarity search
- **React Markdown** - Markdown rendering
- **Tailwind CSS** - Styling

---

## Support

For issues or questions:

1. Check this documentation
2. Review error logs
3. Test in demo environment first
4. Contact development team

---

**Last Updated:** November 23, 2025
