# Claude Code Project Instructions

## User Role

The user is an IT Project Manager, NOT a developer. Never ask the user to:
- Write or modify code
- Run development commands
- Test functionality manually
- Do any development work

If Claude cannot complete a task (e.g., needs a CLI tool installed, needs a package downloaded, needs external access), ask the user for help with that specific blocker - but never delegate the development work itself.

## Project Context

This is an AI chatbot SaaS application using:
- Next.js 16 with App Router
- Clerk for authentication (migrated from NextAuth)
- PostgreSQL with Drizzle ORM
- Vercel AI SDK
- Deployed on Vercel
