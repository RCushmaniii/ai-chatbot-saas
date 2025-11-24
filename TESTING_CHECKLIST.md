# Testing Checklist - Local Environment

Complete this checklist before deploying to production.

## ✅ Pre-Testing Setup

- [ ] Dev server running (`pnpm run dev`)
- [ ] Database connected (check `/admin` loads)
- [ ] OpenAI API key configured
- [ ] Logged in as admin user

---

## 1️⃣ **Admin Dashboard Tests**

### Manual Content Tab

- [ ] **Upload TXT file**

  - Create a test `.txt` file with sample content
  - Upload and verify success message
  - Check file appears in upload list

- [ ] **Upload PDF file**

  - Upload a sample PDF
  - Verify parsing works
  - Check for completion status

- [ ] **Add manual content**
  - Enter text in textarea
  - Select content type and language
  - Click "Add to Knowledge Base"
  - Verify success message

### Website Scraping Tab

- [ ] **Load stats**

  - Click "Load Knowledge Base Stats"
  - Verify counts appear (Website Content: 193, Manual Content: X)

- [ ] **Test ingestion** (optional - takes time)

  - Enter sitemap URL: `https://www.nyenglishteacher.com/sitemap-0.xml`
  - Click "Run Ingestion"
  - Monitor progress
  - Verify completion message

- [ ] **Clear website data**
  - Click "Clear Website Data"
  - Confirm the action
  - Reload stats to verify count is 0

### Bot Settings Tab (Starter Questions)

- [ ] **Add new question**

  - Click "Add Question"
  - Enter emoji: 🎯
  - Enter question: "Test question?"
  - Verify it appears in list

- [ ] **Edit question**

  - Click in question text field
  - Modify the text
  - Verify changes appear in preview

- [ ] **Delete question**

  - Click trash icon on a question
  - Verify it's removed from list

- [ ] **Save questions**
  - Click "Save Starter Questions"
  - Verify success message
  - Reload page to confirm persistence

### Instructions Tab

- [ ] **Edit bot name**

  - Change bot name to "Test Bot"
  - Click "Save Changes"
  - Verify success message

- [ ] **Edit system instructions**

  - Modify the instructions text
  - Click "Save Changes"
  - Verify success message

- [ ] **Reset to default**
  - Click "Reset to Default"
  - Confirm the action
  - Verify instructions reset
  - Save changes

---

## 2️⃣ **Chat Interface Tests**

### Basic Functionality

- [ ] **Start new chat**

  - Navigate to `/`
  - Verify starter questions appear
  - Check they match what you configured in admin

- [ ] **Click starter question**

  - Click one of the suggested questions
  - Verify it populates the input
  - Send the message

- [ ] **Type custom message**
  - Type: "What services do you offer for startup founders?"
  - Send message
  - Verify response appears

### RAG Knowledge Base

- [ ] **Test website content retrieval**

  - Ask: "What services do you offer?"
  - Verify response includes information from website
  - **Check for source URLs** at the end of response
  - Example: "Learn more: https://www.nyenglishteacher.com/..."

- [ ] **Test manual content retrieval**

  - Ask about content you manually uploaded
  - Verify it's used in the response

- [ ] **Test missing information**
  - Ask: "What is the capital of France?"
  - Verify bot says it can only answer about English coaching
  - Check for risk-averse language

### Bilingual Support

- [ ] **Test Spanish input**

  - Ask: "¿Qué servicios ofrecen?"
  - Verify response is in Spanish
  - Check for source URLs

- [ ] **Test English input**
  - Ask: "How much do sessions cost?"
  - Verify response is in English
  - Check for pricing information

### Source Attribution

- [ ] **Verify URLs in responses**
  - Ask several questions about services
  - Each response should include "Learn more:" section
  - URLs should be clickable
  - URLs should be relevant to the question

### Edge Cases

- [ ] **Empty message**

  - Try sending empty message
  - Verify appropriate handling

- [ ] **Very long message**

  - Send a message with 500+ words
  - Verify it processes correctly

- [ ] **Unrelated question**

  - Ask: "What's the weather like?"
  - Verify bot redirects to English coaching topics
  - Check for cautious language

- [ ] **Booking request**
  - Ask: "How do I book a session?"
  - Verify response includes booking URL
  - Check: https://www.nyenglishteacher.com/en/book/

---

## 3️⃣ **System Prompt Tests**

### First-Person Language

- [ ] **Check bot identity**
  - Ask: "Who are you?"
  - Verify response uses "I am" not "We are"
  - Should say "I am an AI assistant for New York English Teacher"

### Risk-Averse Behavior

- [ ] **Test cautious language**

  - Ask: "Can I get a refund?"
  - Verify response uses phrases like:
    - "Based on my search results..."
    - "My interpretation is..."
    - "Here is what it suggests..."

- [ ] **Test missing information handling**
  - Ask: "What is your cancellation policy?"
  - If not in knowledge base, should say:
    - "I could not find information about..."
    - "If you ask more precisely, I might be able to find it"

### Knowledge Scope

- [ ] **Test scope boundaries**
  - Ask about unrelated topics
  - Verify bot stays within English coaching domain
  - Should politely redirect

---

## 4️⃣ **Performance Tests**

### Response Time

- [ ] **Measure response time**

  - Ask a simple question
  - Time from send to first token
  - Should be < 3 seconds

- [ ] **Test with knowledge retrieval**
  - Ask a complex question requiring RAG
  - Time the full response
  - Should be < 10 seconds

### Database Performance

- [ ] **Check stats loading**

  - Time how long stats take to load
  - Should be < 2 seconds

- [ ] **Check ingestion speed** (if testing)
  - Note pages per minute
  - Should process 5-10 pages/minute

---

## 5️⃣ **Console & Error Checking**

### Browser Console

- [ ] **Open browser DevTools**
  - Check for JavaScript errors
  - Verify no 404s for resources
  - Check network tab for failed requests

### Terminal Logs

- [ ] **Monitor dev server logs**

  - Check for knowledge base search logs
  - Example: `📚 Found X knowledge results for: "..."`
  - Verify URLs and similarity scores appear

- [ ] **Check for errors**
  - No database connection errors
  - No OpenAI API errors
  - No authentication errors

---

## 6️⃣ **Data Persistence Tests**

### Settings Persistence

- [ ] **Save and reload**

  - Configure starter questions
  - Save changes
  - Refresh browser
  - Verify questions persist

- [ ] **System instructions persistence**
  - Edit instructions
  - Save changes
  - Restart dev server
  - Verify instructions persist

### Chat History

- [ ] **Test chat persistence**
  - Have a conversation
  - Refresh page
  - Verify chat history loads
  - Check sidebar shows conversation

---

## 7️⃣ **Authentication Tests**

### Login/Logout

- [ ] **Test logout**

  - Click logout
  - Verify redirected to login
  - Try accessing `/admin`
  - Should redirect to login

- [ ] **Test login**
  - Log in with credentials
  - Verify redirected to chat
  - Access `/admin`
  - Should load successfully

---

## 🎯 **Critical Test Scenarios**

### Scenario 1: New User Journey

1. [ ] User visits site
2. [ ] Sees starter questions
3. [ ] Clicks "What services do you offer?"
4. [ ] Gets response with source URLs
5. [ ] Clicks URL to visit website
6. [ ] Returns and asks about pricing
7. [ ] Gets accurate pricing info
8. [ ] Asks how to book
9. [ ] Gets booking URL

### Scenario 2: Bilingual User

1. [ ] User asks in Spanish
2. [ ] Gets Spanish response
3. [ ] Switches to English
4. [ ] Gets English response
5. [ ] Both include source URLs

### Scenario 3: Admin Workflow

1. [ ] Admin logs in
2. [ ] Goes to `/admin`
3. [ ] Uploads new PDF
4. [ ] Adds starter question
5. [ ] Edits system instructions
6. [ ] Saves all changes
7. [ ] Tests in chat
8. [ ] Verifies new content is used

---

## 📊 **Test Results Template**

```
Date: ___________
Tester: ___________

✅ Passed: ___ / ___
❌ Failed: ___ / ___
⚠️  Issues Found: ___ / ___

Critical Issues:
-

Minor Issues:
-

Notes:
-
```

---

## 🐛 **Common Issues & Fixes**

### Issue: No knowledge results found

**Fix:**

- Check database has content
- Verify POSTGRES_URL is correct
- Run ingestion if website_content is empty

### Issue: Starter questions don't appear

**Fix:**

- Verify they're saved in admin
- Check browser console for errors
- Clear cache and reload

### Issue: URLs not in responses

**Fix:**

- Check knowledge base has URLs
- Verify system prompt includes URL requirement
- Check terminal logs for knowledge results

### Issue: Wrong language response

**Fix:**

- Verify system prompt has language matching rule
- Check user message language detection
- Test with clear language indicators

---

## ✅ **Sign-Off**

Once all tests pass:

- [ ] All critical tests passed
- [ ] No blocking issues
- [ ] Performance acceptable
- [ ] Ready for production deployment

**Tested by:** ****\_\_\_****  
**Date:** ****\_\_\_****  
**Approved for deployment:** [ ] Yes [ ] No
