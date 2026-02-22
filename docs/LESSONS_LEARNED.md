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

## Performance Notes

- Knowledge base queries can be slow with large document sets - HNSW indexes on embedding columns are critical
- Streaming responses improve perceived performance for chat
- `next.config.ts` uses `optimizePackageImports` for date-fns, lucide-react, framer-motion
- React `memo()` comparison functions must return `true` when props are equal (skip re-render), `false` when different

## Testing

- E2E tests use Playwright - run with `pnpm test`
- The `/ping` endpoint exists for health checks in tests
