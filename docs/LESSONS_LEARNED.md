# Lessons Learned

Critical information about build processes, common pitfalls, and solutions encountered during development. **Read this before making significant changes.**

## Build & Deployment

### Vercel Deployment
- This project deploys on Vercel - always test builds locally with `pnpm build` before pushing
- Environment variables must be configured in Vercel dashboard, not just `.env.local`

### Database (Drizzle ORM)
- Run `pnpm db:push` after schema changes to sync with PostgreSQL
- Never modify the database directly - always use Drizzle migrations
- Custom migrations live in `/migrations/` and must be applied manually

## Authentication (Clerk)

- Project uses **Clerk** for authentication (migrated from NextAuth - ignore any legacy NextAuth references)
- **Next.js 16 uses `proxy.ts`** instead of `middleware.ts` for request interception - both cannot coexist
- Security headers (CSP, HSTS, X-Frame-Options) are applied in `proxy.ts`
- Use `auth()` from `@clerk/nextjs/server` for server-side auth checks
- RBAC is implemented in `lib/permissions.ts` with roles: owner, admin, member
- `lib/auth.ts` provides `requirePermission()` helper for route protection

## Common Pitfalls

### API Routes
- App Router API routes use `route.ts` files, not `pages/api`
- Always handle authentication in API routes - don't assume proxy catches everything
- All admin routes must use `requirePermission()` for RBAC enforcement

### AI/LLM Integration
- Vercel AI SDK is used for streaming responses
- Token limits and rate limiting should be handled gracefully
- Never expose API keys client-side
- Rate limiting is currently in-memory (`lib/rate-limit.ts`) - does NOT work across Vercel serverless instances. Migrate to Upstash Redis for production at scale.

### Widget Embedding
- The embeddable widget must work cross-origin
- Test widget in incognito mode to catch auth/cookie issues

### Multi-Tenancy
- ALL database queries must filter by `businessId` for tenant isolation
- `website_content` and `Document_Knowledge` tables both have `business_id` - always filter by it
- The `User.password` column was removed (Clerk handles auth)

## Things That Broke (And How We Fixed Them)

| Date | Issue | Root Cause | Solution |
|------|-------|------------|----------|
| 2025-02 | memo() never memoized Messages component | Comparison function returned `false` at end instead of `true` | Fixed final return to `return true` in both Messages and PreviewMessage |
| 2025-02 | Monthly retraining drifted over time | Used fixed 30-day interval instead of calendar month | Replaced with `setMonth(getMonth() + 1)` |
| 2026-03 | 16 E2E tests failing in CI | Zod schema missing `chat-model-mini` — all chat requests got 400 | Added `"chat-model-mini"` to `postRequestBodySchema` enum |
| 2026-03 | All 9 chat tests timeout after test refactor | `textContent()` auto-waits 30s for missing elements | Use instant `count()` before `textContent()` |
| 2026-03 | Session test click blocked by `<nextjs-portal>` | Hydration mismatch in SidebarUserNav triggered dev overlay | Deferred Clerk `isLoaded` to after hydration with useState+useEffect |
| 2026-03 | Reasoning toggle test fails with `forceMount` | Radix keeps element with full dimensions when force-mounted | Removed `forceMount`, let element unmount naturally |

## Performance Notes

- Knowledge base queries can be slow with large document sets - HNSW indexes on embedding columns are critical
- Streaming responses improve perceived performance for chat
- `next.config.ts` uses `optimizePackageImports` for date-fns, lucide-react, framer-motion
- React `memo()` comparison functions must return `true` when props are equal (skip re-render), `false` when different

## Testing

- E2E tests use Playwright - run with `pnpm test`
- The `/ping` endpoint exists for health checks in tests
- Tests run against the dev server (`pnpm dev`), not a production build

### E2E Test Architecture

The E2E test suite uses mock AI models (`lib/ai/models.mock.ts`) in CI. The `isTestEnvironment` flag in `lib/constants.ts` switches between mock and real providers. This is controlled by `PLAYWRIGHT=True` env var.

**Test fixtures** (`tests/fixtures.ts`):
- `adaContext`, `babbageContext`, `curieContext` — worker-scoped Clerk-authenticated browser contexts
- Worker-scoped means shared across all tests in the same Playwright worker
- If one test corrupts a context, all subsequent tests in that worker fail with "Target page, context or browser has been closed"

**Page objects** (`tests/pages/chat.ts`):
- `ChatPage` wraps common chat interactions
- `sendUserMessage()` sets up the response listener BEFORE clicking send (critical — mock streams are fast enough to finish before a separate listener starts)
- `isGenerationComplete()` waits for the `/api/chat` response + 150ms for React to flush its throttled render batch

### Playwright + React Pitfalls

#### 1. Playwright auto-wait behavior varies by method

| Method | Auto-waits? | Timeout |
|--------|-------------|---------|
| `locator.textContent()` | Yes — waits for element to attach | Default action timeout (30s) |
| `locator.innerText()` | Yes — waits for element to attach | Default action timeout (30s) |
| `locator.isVisible()` | **No** — returns immediately | Instant |
| `locator.count()` | **No** — returns immediately | Instant |
| `expect(loc).toBeVisible()` | Yes — retries assertion | Assert timeout (30s) |

**Trap:** Using `textContent()` or `innerText()` on an element that may not exist will silently wait 30 seconds before the `.catch()` fires. Use instant `count()` or `isVisible()` first to check existence.

```typescript
// BAD — waits 30s if element doesn't exist
const text = await locator.getByTestId("maybe-missing").textContent().catch(() => null);

// GOOD — instant check, then read
const exists = (await locator.getByTestId("maybe-missing").count()) > 0;
const text = exists ? await locator.getByTestId("maybe-missing").textContent() : null;
```

#### 2. `experimental_throttle` delays React renders

The chat component uses `experimental_throttle: 100` in `useChat()`, which batches state updates every 100ms. After a stream finishes, the final render might not commit for up to 100ms. The `isGenerationComplete()` method adds a 150ms wait after `response.finished()` to account for this.

#### 3. Zod schemas must match default values

If you add a new model ID or change `DEFAULT_CHAT_MODEL`, update the Zod enum in `app/(chat)/api/chat/schema.ts` to accept it. A mismatch causes silent 400 errors that are hard to diagnose — the client shows a toast via `onError` but no assistant message renders.

#### 4. Next.js dev overlay blocks ALL pointer events

In dev mode, hydration mismatches trigger the Next.js error overlay (`<nextjs-portal>`), which covers the entire page and intercepts all clicks. This causes every Playwright `click()` to fail with "element intercepted by `<nextjs-portal>`".

**Fix hydration mismatches, especially in components using Clerk's `useUser()`:**

```typescript
// BAD — isLoaded can differ between server (false) and client (true)
const { isLoaded } = useUser();

// GOOD — defer to after hydration so server/client always match
const { isLoaded: isClerkLoaded } = useUser();
const [isHydrated, setIsHydrated] = useState(false);
useEffect(() => setIsHydrated(true), []);
const isLoaded = isHydrated && isClerkLoaded;
```

#### 5. Radix Collapsible + `forceMount` breaks visibility assertions

Radix `CollapsibleContent` with `forceMount` stays in the DOM with full dimensions even when `data-state="closed"`. Playwright's `not.toBeVisible()` fails because the element has a non-zero bounding box. Without `forceMount`, the element unmounts after the close animation, which Playwright correctly detects as "not visible."

#### 6. Mock model response patterns must match test expectations

`lib/ai/models.mock.ts` uses pattern matching on user message text to return specific responses. When UI text changes (e.g., suggestion button labels), the mock patterns and test assertions must be updated together.

#### 7. File upload tests require Vercel Blob

The upload endpoint (`/api/files/upload`) uses `@vercel/blob`. Without `BLOB_READ_WRITE_TOKEN` in CI, uploads fail silently. Skip these tests: `test.skip(!process.env.BLOB_READ_WRITE_TOKEN, "Requires Vercel Blob storage")`.

#### 8. Server-side redirects lose query parameters

`redirect("/chat")` in Next.js server components drops query params from the original URL. If a test navigates to `/?query=foo`, the redirect to `/chat` loses `?query=foo`. Navigate directly to `/chat?query=foo` instead.

### CI Environment Differences

| Resource | Local | CI |
|----------|-------|----|
| OpenAI `text-embedding-3-small` | Works (if key has access) | May return 403 (project-level access) |
| Vercel Blob (`BLOB_READ_WRITE_TOKEN`) | Optional | Usually not set |
| Redis (`REDIS_URL`) | Optional | Not set — resumable streams disabled |
| Clerk auth | Real users | Test users via `@clerk/testing` |
| AI models | Real OpenAI models | Mock models (`lib/ai/models.mock.ts`) |
