# Lessons Learned

Critical information about build processes, common pitfalls, and solutions encountered during development. **Read this before making significant changes.**

## Build & Deployment

### Vercel Deployment
- This project deploys on Vercel - always test builds locally with `npm run build` before pushing
- Environment variables must be configured in Vercel dashboard, not just `.env.local`

### Database (Drizzle ORM)
- Run `npm run db:push` after schema changes to sync with PostgreSQL
- Never modify the database directly - always use Drizzle migrations

## Authentication (Clerk)

- Project was migrated from NextAuth to Clerk - ignore any legacy NextAuth references
- Clerk middleware protects routes - check `middleware.ts` for auth configuration
- Use `auth()` from `@clerk/nextjs/server` for server-side auth checks

## Common Pitfalls

### API Routes
- App Router API routes use `route.ts` files, not `pages/api`
- Always handle authentication in API routes - don't assume middleware catches everything

### AI/LLM Integration
- Vercel AI SDK is used for streaming responses
- Token limits and rate limiting should be handled gracefully
- Never expose API keys client-side

### Widget Embedding
- The embeddable widget must work cross-origin
- Test widget in incognito mode to catch auth/cookie issues

## Things That Broke (And How We Fixed Them)

<!-- Add entries as issues are discovered and resolved -->

| Date | Issue | Root Cause | Solution |
|------|-------|------------|----------|
| <!-- YYYY-MM-DD --> | <!-- What broke --> | <!-- Why it broke --> | <!-- How it was fixed --> |

## Performance Notes

- Knowledge base queries can be slow with large document sets - consider pagination
- Streaming responses improve perceived performance for chat

## Testing

- E2E tests use Playwright - run with `npm run test:e2e`
- The `/ping` endpoint exists for health checks in tests
