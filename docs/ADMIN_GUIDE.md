# Admin Dashboard User Guide

Complete guide to managing your AI chatbot through the admin dashboard.

## Table of Contents

- [Accessing the Admin Dashboard](#accessing-the-admin-dashboard)
- [Manual Content Management](#manual-content-management)
- [Website Scraping](#website-scraping)
- [Bot Settings (Starter Questions)](#bot-settings-starter-questions)
- [System Instructions](#system-instructions)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Accessing the Admin Dashboard

1. Navigate to `/admin` in your browser
2. Log in with your credentials
3. You'll see 4 tabs: Manual Content, Website Scraping, Bot Settings, Instructions

---

## Manual Content Management

### Adding Content Manually

1. **Navigate to "Manual Content" tab**
2. **Enter content** in the textarea
   - Write clear, detailed information
   - Use natural language as if explaining to a customer
3. **Select Content Type:**
   - General Info
   - Services
   - Pricing
   - FAQ
   - Coaching Approach
   - Target Audience
   - Testimonial
   - Blog Article
4. **Select Language:** English or Spanish
5. **Add URL (optional):** Reference URL for this content
6. **Click "Add to Knowledge Base"**

### Uploading Files

Supported formats: `.txt`, `.md`, `.pdf`

1. **Select Content Type and Language** (applies to all files)
2. **Click the upload area** or drag and drop files
3. **Monitor upload progress**
   - Files are automatically chunked for optimal search
   - PDFs are parsed server-side
   - Long files are split into smaller chunks
4. **Check for completion** (green checkmark)

### Tips for Manual Content

- ✅ **Be specific** - Include details like pricing, services, processes
- ✅ **Use natural language** - Write as if explaining to a customer
- ✅ **Add both languages** - Create English and Spanish versions
- ✅ **Update regularly** - Keep information current
- ✅ **Include examples** - Real scenarios help the AI understand context

---

## Website Scraping

### Running Website Ingestion

1. **Navigate to "Website Scraping" tab**
2. **Click "Load Knowledge Base Stats"** to see current data
3. **Enter your sitemap URL**
   - Example: `https://www.yoursite.com/sitemap.xml`
   - Must be a valid XML sitemap
4. **Click "Run Ingestion"**
   - This may take several minutes
   - Progress is shown in real-time
   - Do not close the browser window

### What Happens During Ingestion

The system will:

1. Fetch and parse your sitemap XML
2. Filter URLs by pattern (e.g., only English pages)
3. Scrape HTML content from each page
4. Extract clean text (removes scripts, styles, navigation)
5. Split content into 1000-character chunks with 200-character overlap
6. Generate embeddings using OpenAI
7. Store in the `website_content` table
8. Create vector indexes for fast semantic search

### Monitoring Progress

- **Pages Processed:** Shows X/Y format
- **Chunks Created:** Total searchable chunks generated
- **Completion Message:** Displays final stats

### Clearing Website Data

- **Use "Clear Website Data" button** to reset
- This only clears the `website_content` table
- Manual content in `Document_Knowledge` is preserved
- Useful when:
  - Website content has changed significantly
  - You want to re-scrape with different settings
  - Testing different sitemap URLs

### Knowledge Base Stats

Two types of content:

- **Website Content:** Automatically scraped from sitemap
- **Manual Content:** Files and text you've uploaded

The chatbot searches website content first, then falls back to manual content.

---

## Bot Settings (Starter Questions)

### Managing Starter Questions

Starter questions are suggested prompts that appear when users start a new conversation.

### Adding Questions

1. **Navigate to "Bot Settings" tab**
2. **Click "Add Question"**
3. **Enter emoji** (optional, 1-2 characters)
   - Examples: 📅, 💼, ⭐, 📚, 💬
4. **Enter question text**
   - Keep it concise and clear
   - Use both English and Spanish
5. **Repeat** for multiple questions

### Editing Questions

- Click in any field to edit
- Changes are saved when you click "Save Starter Questions"

### Deleting Questions

- Click the trash icon (🗑️) next to any question
- Question is removed immediately
- Remember to save changes

### Reordering Questions

- Drag the grip icon (⋮⋮) to reorder (coming soon)
- Questions appear in the order shown

### Preview

The preview section shows exactly how questions will appear to users.

### Best Practices

- ✅ **3-5 questions** - Don't overwhelm users
- ✅ **Cover key topics** - Services, pricing, booking, testimonials
- ✅ **Use both languages** - Mix English and Spanish
- ✅ **Add emojis** - Makes questions visually appealing
- ✅ **Be specific** - "What are your pricing options?" vs "Tell me more"
- ✅ **Test them** - Click questions in the chat to ensure good responses

### Example Questions

```
📅 ¿Cómo puedo agendar una consulta gratuita?
💼 ¿Qué servicios de coaching ofrecen?
⭐ ¿Dónde puedo leer testimonios de clientes?
📚 What services do you offer for startup founders?
💬 How much do your coaching sessions cost?
```

---

## System Instructions

### Bot Identity

**Bot Name:**

- This name is used when the bot introduces itself
- Example: "New York English Teacher", "AI Assistant", "Sophia"
- Keep it professional and memorable

### Custom Instructions

The system instructions define your chatbot's:

- **Personality** - Tone, style, formality level
- **Knowledge Scope** - What topics it can/cannot discuss
- **Behavior Rules** - How to handle edge cases
- **Response Patterns** - Cautious vs confident language

### Default Template

The default instructions include:

1. **Language Matching** - Respond in user's language
2. **Scope of Knowledge** - Only use knowledge base results
3. **Cautious Language** - Risk-averse phrasing
4. **Missing Information** - How to handle unknowns
5. **Booking Requests** - Standard response with URL
6. **URL Attribution** - Always include source links

### Customizing Instructions

1. **Navigate to "Instructions" tab**
2. **Edit Bot Name** if desired
3. **Modify Custom Instructions:**
   - Add business-specific rules
   - Define personality traits
   - Set knowledge boundaries
   - Include example responses
4. **Click "Save Changes"**

### Risk-Averse Approach

The default template uses cautious language:

- ❌ "Yes, you can do this"
- ✅ "Based on my search results, my interpretation is that it can be done"

- ❌ "Here is how you do it"
- ✅ "Here is what it suggests"

This minimizes liability and encourages users to verify critical information.

### Reset to Default

- Click "Reset to Default" to restore original instructions
- Useful if you want to start over
- Remember to save after resetting

### Tips for Writing Instructions

- ✅ **Be specific** - Clearly define dos and don'ts
- ✅ **Use examples** - Show the bot how to respond
- ✅ **Set boundaries** - Define scope of knowledge
- ✅ **Define tone** - Formal, casual, encouraging, etc.
- ✅ **Include escalation** - When to suggest human contact
- ✅ **Test thoroughly** - Try edge cases and unusual questions

---

## Best Practices

### Content Strategy

1. **Start with website scraping** - Index your main site first
2. **Add manual content** for information not on your website
3. **Test the chatbot** with real questions
4. **Refine based on results** - Add missing information
5. **Update regularly** - Keep content current

### Maintenance Schedule

**Weekly:**

- Review chat logs for unanswered questions
- Add missing information to knowledge base

**Monthly:**

- Re-run website ingestion to catch updates
- Review and update starter questions
- Refine system instructions based on user feedback

**Quarterly:**

- Audit all manual content for accuracy
- Update pricing and service information
- Test chatbot with new scenarios

### Quality Assurance

Before launching:

1. ✅ Test all starter questions
2. ✅ Ask about pricing, services, booking
3. ✅ Try questions in both English and Spanish
4. ✅ Test edge cases (unrelated topics, unclear questions)
5. ✅ Verify URLs are included in responses
6. ✅ Check that escalation to human works

---

## Troubleshooting

### Website Scraping Issues

**Problem:** Ingestion times out

- **Solution:** Website may be too large. Run `pnpm run ingest` manually in terminal

**Problem:** No pages found in sitemap

- **Solution:** Check sitemap URL is correct and publicly accessible
- **Solution:** Verify sitemap is valid XML format

**Problem:** Pages scraped but no content

- **Solution:** Website may use JavaScript rendering. Content must be in HTML source

### Knowledge Base Issues

**Problem:** Chatbot doesn't use uploaded content

- **Solution:** Check content was saved successfully
- **Solution:** Try more specific questions
- **Solution:** Content may not be semantically similar to question

**Problem:** Chatbot gives wrong information

- **Solution:** Review knowledge base for conflicting content
- **Solution:** Update or remove outdated information
- **Solution:** Refine system instructions to be more cautious

### Settings Issues

**Problem:** Starter questions don't appear

- **Solution:** Ensure you clicked "Save Starter Questions"
- **Solution:** Clear browser cache and reload
- **Solution:** Check questions aren't empty

**Problem:** System instructions not applied

- **Solution:** Ensure you clicked "Save Changes"
- **Solution:** Restart dev server if running locally
- **Solution:** Check for syntax errors in instructions

### Performance Issues

**Problem:** Slow responses

- **Solution:** Reduce number of chunks retrieved (edit search limit)
- **Solution:** Optimize knowledge base (remove duplicate content)
- **Solution:** Check OpenAI API status

**Problem:** Database errors

- **Solution:** Verify `POSTGRES_URL` environment variable
- **Solution:** Check database connection limits
- **Solution:** Ensure pgvector extension is installed

---

## Getting Help

If you encounter issues not covered here:

1. Check the [API Documentation](./API.md)
2. Review the [Deployment Guide](./DEPLOYMENT.md)
3. Check browser console for errors
4. Review server logs for API errors
5. Contact support with specific error messages

---

## Next Steps

- [API Documentation](./API.md) - Technical API reference
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Main README](../README.md) - Project overview
