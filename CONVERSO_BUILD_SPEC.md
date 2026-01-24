# Converso SaaS Build Specification

> **For AI Assistant Implementation**
> This document contains all requirements to transform the existing ai-chatbot-saas codebase into a production-ready bilingual SaaS product called **Converso**.

---

## 1. Brand Identity

### Product
- **Name:** Converso
- **Domain:** soyconverso.com
- **Tagline:** "AI that speaks your language" / "AI que habla tu idioma"
- **Value Proposition:** "Hola, soy Converso. La inteligencia artificial que habla tu negocio."

### Brand Voice
- Friendly, conversational, approachable
- Personified AI (treat as a helpful team member, not cold software)
- Bilingual (English/Spanish) throughout

### Logo Usage
- Logo: "C" icon + word "Converso" (no "Soy" in logo)
- Browser tab: "Converso | AI Chatbot para Empresas"
- Email: hola@soyconverso.com
- Social handles: @soyconverso

---

## 2. Design System

### Color Palette ("Cielito Lindo")

Update `tailwind.config.ts` with these semantic colors:

```typescript
colors: {
  brand: {
    cielito: '#6CB4EE',    // Primary Brand Blue
    jade: '#20B2AA',       // Secondary / AI Accent
    jadeDark: '#16807A',   // Hover state for Jade buttons
  },
  surface: {
    sand: '#F9F7F2',       // Main Page Background (Warm White)
    paper: '#FFFFFF',      // Card/Container Background
    subtle: '#EAE0C8',     // Borders / Dividers
  },
  ink: {
    DEFAULT: '#0F4C5C',    // Primary Text (Deep Teal)
    muted: '#5C7C85',      // Secondary Text
    light: '#A3B8BF',      // Placeholders
  },
  state: {
    success: '#20B2AA',    // Reusing Jade
    error: '#E2725B',      // Terracotta
    warning: '#FDB813',    // Solar Yellow
  }
}
```

### Typography

Add Google Fonts import to `app/layout.tsx`:
```typescript
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800']
})
```

Update `tailwind.config.ts`:
```typescript
fontFamily: {
  sans: ['var(--font-body)', 'Inter', 'sans-serif'],
  display: ['var(--font-display)', 'Plus Jakarta Sans', 'sans-serif'],
},
fontSize: {
  'display-1': ['clamp(2.5rem, 5vw + 1rem, 4rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
  'display-2': ['clamp(2rem, 4vw + 1rem, 3rem)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
  'heading-3': ['clamp(1.5rem, 2vw + 1rem, 2rem)', { lineHeight: '1.3' }],
}
```

### UI Components

- **Border Radius:**
  - Cards/Containers: `rounded-2xl` (16px)
  - Buttons: `rounded-full` for primary CTA, `rounded-lg` for secondary

- **Shadows (colored, not black):**
  - Soft lift: `shadow-[0_4px_20px_-2px_rgba(108,180,238,0.15)]`
  - Floating action: `shadow-[0_10px_40px_-10px_rgba(32,178,170,0.25)]`

- **Primary Button Style:**
  ```
  bg-brand-jade text-white hover:bg-brand-jadeDark rounded-full px-8 py-3 font-semibold
  ```

---

## 3. Technical Stack (Confirmed)

**Updated stack with Neon + Clerk:**

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Next.js 15 (App Router) | Keep existing |
| **Database** | PostgreSQL via **Neon** | Serverless, pgvector support |
| **ORM** | Drizzle ORM | Keep existing, works with Neon |
| **Auth** | **Clerk** | Replaces NextAuth - handles auth UI, sessions, user management |
| **AI** | OpenAI (GPT-4o) | Keep existing |
| **Payments** | Stripe | To be integrated |
| **Styling** | Tailwind CSS | Keep existing |
| **Deployment** | Vercel | Keep existing |

### Migration from NextAuth to Clerk

**Remove:**
- `next-auth` package
- `app/(auth)/auth.ts` - NextAuth configuration
- `app/(auth)/auth.config.ts` - Auth config
- Custom login/register pages (Clerk provides these)
- Password hashing logic (`bcrypt-ts`)

**Add:**
- `@clerk/nextjs` package
- Clerk middleware for route protection
- Clerk webhook handler for user sync

**Key Differences:**
| NextAuth | Clerk |
|----------|-------|
| `getServerSession()` | `auth()` from `@clerk/nextjs/server` |
| `useSession()` | `useUser()` or `useAuth()` |
| Custom login page | Clerk's hosted/embedded `<SignIn />` |
| Password storage in DB | Clerk manages passwords |
| `session.user.id` | `auth().userId` (Clerk user ID) |

---

## 4. Database Schema Updates

### New Tables Required

Add to `lib/db/schema.ts`:

```typescript
// Subscription Plans
export const plan = pgTable('Plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull(), // 'free', 'starter', 'pro', 'business'
  displayName: varchar('display_name', { length: 100 }).notNull(),
  priceMonthly: integer('price_monthly').notNull(), // cents
  priceAnnual: integer('price_annual').notNull(), // cents (annual total, not monthly)
  stripePriceIdMonthly: varchar('stripe_price_id_monthly', { length: 100 }),
  stripePriceIdAnnual: varchar('stripe_price_id_annual', { length: 100 }),
  // Limits
  messagesPerMonth: integer('messages_per_month').notNull(),
  knowledgeBasePagesLimit: integer('knowledge_base_pages_limit').notNull(),
  chatbotsLimit: integer('chatbots_limit').notNull(),
  teamMembersLimit: integer('team_members_limit').notNull(),
  // Features
  features: jsonb('features').notNull(), // Array of feature strings
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Subscriptions
export const subscription = pgTable('Subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => business.id),
  planId: uuid('plan_id').notNull().references(() => plan.id),
  stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull(), // 'trialing', 'active', 'canceled', 'past_due'
  billingCycle: varchar('billing_cycle', { length: 10 }).notNull(), // 'monthly', 'annual'
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  trialEndsAt: timestamp('trial_ends_at'),
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Usage Tracking
export const usageRecord = pgTable('UsageRecord', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => business.id),
  month: varchar('month', { length: 7 }).notNull(), // 'YYYY-MM'
  messagesCount: integer('messages_count').default(0),
  tokensUsed: integer('tokens_used').default(0),
  knowledgeBasePagesCount: integer('knowledge_base_pages_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Update User Table (Clerk Integration)

**Important:** With Clerk, user authentication data (email, password, profile) is managed by Clerk. Our database stores a reference to the Clerk user plus any app-specific data.

Replace the existing `user` table:
```typescript
// User table - synced from Clerk via webhook
export const user = pgTable('User', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: varchar('clerk_user_id', { length: 100 }).notNull().unique(), // Clerk's user ID
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  locale: varchar('locale', { length: 5 }).default('en'), // 'en' or 'es'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Clerk Webhook Handler** (`app/api/clerk/webhook/route.ts`):
- Listen for `user.created` - Create user record in our DB
- Listen for `user.updated` - Sync profile changes
- Listen for `user.deleted` - Handle user deletion (soft delete or cascade)

### Update Membership Table

Ensure roles are properly typed:
```typescript
export const membershipRoleEnum = pgEnum('membership_role', ['owner', 'admin', 'member']);

// Update membership table
role: membershipRoleEnum('role').notNull().default('member'),
```

---

## 5. User Roles & Permissions

### Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Owner** | Business creator | Full control, billing, delete business, transfer ownership |
| **Admin** | Team administrator | Manage team members, configure bots, view analytics, manage knowledge base |
| **Member** | Regular team user | Use chat, view knowledge base, configure own bot settings |
| **Anonymous** | Widget end-user | Chat via embed only, no account required |

### Permission Matrix

Create `lib/permissions.ts`:

```typescript
export const permissions = {
  owner: [
    'billing:manage',
    'business:delete',
    'business:settings',
    'team:invite',
    'team:remove',
    'team:change-role',
    'bot:create',
    'bot:delete',
    'bot:configure',
    'knowledge:manage',
    'analytics:view',
    'chat:use',
  ],
  admin: [
    'team:invite',
    'team:remove',
    'bot:create',
    'bot:configure',
    'knowledge:manage',
    'analytics:view',
    'chat:use',
  ],
  member: [
    'bot:configure', // own bots only
    'chat:use',
  ],
} as const;

export function hasPermission(role: string, permission: string): boolean {
  return permissions[role]?.includes(permission) ?? false;
}
```

---

## 6. Pricing Tiers

### Tier Structure

| Tier | Monthly USD | Annual USD | Messages/mo | KB Pages | Chatbots | Team |
|------|-------------|------------|-------------|----------|----------|------|
| **Free** | $0 | $0 | 100 | 10 | 1 | 1 |
| **Starter** | $19 | $190 (~$15.83/mo) | 2,000 | 100 | 2 | 2 |
| **Pro** | $49 | $490 (~$40.83/mo) | 10,000 | 500 | 5 | 5 |
| **Business** | $99 | $990 (~$82.50/mo) | 50,000 | 2,000 | 20 | 20 |
| **Enterprise** | Contact | Contact | Unlimited | Unlimited | Unlimited | Unlimited |

### Free Tier Limits
- 14-day trial period (matches trial)
- 100 messages per month
- 10 knowledge base pages
- 1 chatbot
- 1 team member (owner only)
- Converso branding on widget

### Annual Discount
- **~17% discount** on annual plans
- Highlight savings on pricing page: "Save $38/year" etc.

### Trial Period
- **Duration:** 14 days
- **Credit card required:** No
- **Features:** Full Pro tier access during trial
- **After trial:** Downgrade to Free tier automatically

---

## 7. Clerk Authentication Integration

### Required Environment Variables

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Clerk routing (optional but recommended)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Files to Create/Update

#### `middleware.ts` (root level)
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/demo',
  '/docs(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/embed(.*)',
  '/embed(.*)',
  '/api/clerk/webhook',
  '/api/stripe/webhook',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

#### `app/api/clerk/webhook/route.ts`
```typescript
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET')
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    return new Response('Verification failed', { status: 400 })
  }

  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    await db.insert(user).values({
      clerkUserId: id,
      email: email_addresses[0]?.email_address ?? '',
      name: [first_name, last_name].filter(Boolean).join(' ') || null,
      avatarUrl: image_url || null,
    })

    // Also create default Business and Membership for new user
    // ... (implement business creation logic)
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    await db.update(user)
      .set({
        email: email_addresses[0]?.email_address ?? '',
        name: [first_name, last_name].filter(Boolean).join(' ') || null,
        avatarUrl: image_url || null,
        updatedAt: new Date(),
      })
      .where(eq(user.clerkUserId, id))
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data
    // Handle deletion - soft delete or cascade
    // await db.delete(user).where(eq(user.clerkUserId, id))
  }

  return new Response('OK', { status: 200 })
}
```

#### `lib/auth.ts` (utility functions)
```typescript
import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { user, membership } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getDbUser() {
  const { userId } = await auth()
  if (!userId) return null

  const dbUser = await db.query.user.findFirst({
    where: eq(user.clerkUserId, userId),
  })

  return dbUser
}

export async function getDbUserWithMembership() {
  const dbUser = await getDbUser()
  if (!dbUser) return null

  const memberships = await db.query.membership.findMany({
    where: eq(membership.userId, dbUser.id),
    with: {
      business: true,
    },
  })

  return { ...dbUser, memberships }
}

export async function requireAuth() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}
```

### Auth Pages (Clerk-hosted vs Custom)

**Option A: Clerk-hosted pages (Recommended for launch)**
- Set environment variables, Clerk handles `/sign-in` and `/sign-up`
- Fastest to implement
- Can customize with Clerk Dashboard appearance settings

**Option B: Custom pages with Clerk components**
```typescript
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sand">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-surface-paper shadow-lg rounded-2xl',
            headerTitle: 'font-display text-ink',
            primaryButton: 'bg-brand-jade hover:bg-brand-jadeDark',
          }
        }}
      />
    </div>
  )
}

// app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sand">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-surface-paper shadow-lg rounded-2xl',
            headerTitle: 'font-display text-ink',
            primaryButton: 'bg-brand-jade hover:bg-brand-jadeDark',
          }
        }}
      />
    </div>
  )
}
```

### Accessing User in Components

**Server Components:**
```typescript
import { auth, currentUser } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const { userId } = await auth()
  const clerkUser = await currentUser()

  // For app-specific data, query your DB
  const dbUser = await getDbUser()

  return <div>Welcome, {clerkUser?.firstName}</div>
}
```

**Client Components:**
```typescript
'use client'
import { useUser, useAuth } from '@clerk/nextjs'

export function UserGreeting() {
  const { user, isLoaded } = useUser()
  const { userId } = useAuth()

  if (!isLoaded) return <div>Loading...</div>

  return <div>Hello, {user?.firstName}</div>
}
```

---

## 8. Stripe Integration

### Required Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Files to Create

#### `lib/stripe.ts`
```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});
```

#### `app/api/stripe/checkout/route.ts`
- Create Stripe Checkout session
- Accept planId and billingCycle (monthly/annual)
- Set success/cancel URLs
- Include trial_period_days: 14 for new subscriptions

#### `app/api/stripe/webhook/route.ts`
Handle events:
- `checkout.session.completed` - Create/update subscription
- `customer.subscription.updated` - Sync status
- `customer.subscription.deleted` - Mark canceled
- `invoice.payment_failed` - Mark past_due

#### `app/api/stripe/portal/route.ts`
- Create Stripe Customer Portal session for self-service billing

### Pricing Page Checkout Flow

1. User clicks "Get Started" on plan
2. If not logged in → Redirect to `/register?plan=starter&cycle=monthly`
3. After registration → Create Stripe Checkout session
4. Stripe handles payment
5. Webhook creates subscription record
6. User redirected to dashboard

---

## 8. Pages to Build/Update

### 8.1 Landing Page (`/`)

**File:** `app/(marketing)/page.tsx` (new route group)

**Sections:**
1. **Hero**
   - Headline: "AI que habla tu idioma" (with language toggle)
   - Subheadline: Value prop
   - CTA: "Empieza gratis" (jade button)
   - Secondary: "Ver demo"
   - Hero image/illustration of chat widget

2. **Social Proof**
   - "Trusted by X businesses" (placeholder for now)
   - Logo carousel (placeholder)

3. **Features Grid**
   - Bilingual AI
   - Easy embed (one line of code)
   - Knowledge base
   - Analytics dashboard
   - Custom branding
   - Team collaboration

4. **How It Works**
   - Step 1: Sign up
   - Step 2: Train your bot
   - Step 3: Embed & go live

5. **Pricing Section** (anchor link #pricing)
   - Tier cards with feature comparison
   - Monthly/Annual toggle
   - Enterprise "Contact Sales" CTA

6. **FAQ**
   - Common questions in accordion

7. **Final CTA**
   - "Ready to transform your customer support?"
   - Email capture or "Get Started" button

8. **Footer**
   - Links: Pricing, Demo, Docs, Login
   - Legal: Privacy, Terms
   - Social: @soyconverso
   - Language toggle

### 8.2 Pricing Page (`/pricing`)

**File:** `app/(marketing)/pricing/page.tsx`

- Dedicated pricing page with full comparison table
- FAQ specific to pricing/billing
- Enterprise contact form

### 8.3 Demo Page (`/demo`)

**File:** Update existing `app/demo/page.tsx`

- Interactive widget demo
- "Try it yourself" section
- Show customization options

### 8.4 Documentation (`/docs`)

**File:** `app/(marketing)/docs/page.tsx` or use existing `/documentation`

**Sections:**
- Getting Started
- Embed Widget
- API Reference (future)
- Customization
- Troubleshooting

### 8.5 Sign In (`/sign-in`) - Clerk

**File:** `app/(auth)/sign-in/[[...sign-in]]/page.tsx`

With Clerk, authentication UI is handled by Clerk components:
- Use `<SignIn />` component with Converso styling
- Apply brand colors via Clerk appearance API
- Clerk handles: email/password, OAuth, magic links, MFA
- Automatic "Forgot password" flow

### 8.6 Sign Up (`/sign-up`) - Clerk

**File:** `app/(auth)/sign-up/[[...sign-up]]/page.tsx`

- Use `<SignUp />` component with Converso styling
- Accept `?plan=` and `?cycle=` query params via redirect URL
- Clerk webhook creates user record in our DB
- After signup, redirect to `/dashboard` or Stripe checkout (if plan selected)

### 8.7 Dashboard (`/dashboard`)

**File:** `app/(chat)/dashboard/page.tsx` (new)

Replace current chat-first homepage with proper dashboard:

**Sections:**
- Welcome message with quick actions
- Usage stats (messages this month, % of limit)
- Chatbots list
- Recent conversations
- Quick links: Settings, Knowledge Base, Embed Code

### 8.8 Admin/Settings Pages

Update existing admin pages with new design system:
- `/admin` → `/settings` (rename for clarity)
- `/settings/team` - Team management
- `/settings/billing` - Subscription & invoices (Stripe portal link)
- `/settings/bots` - Bot configuration
- `/settings/knowledge` - Knowledge base management
- `/settings/embed` - Embed code generator

---

## 9. Widget Improvements

### Configuration Options

Update `BotSettings` schema and embed script to support:

```typescript
interface WidgetConfig {
  // Appearance
  buttonColor: string;        // Default: brand.jade
  buttonSize: 'small' | 'medium' | 'large';
  position: 'bottom-right' | 'bottom-left';
  fontFamily: string;         // Default: 'Inter'

  // Content
  welcomeMessage: string;
  placeholder: string;
  botName: string;
  botAvatar?: string;

  // Behavior
  language: 'en' | 'es' | 'auto';
  showBranding: boolean;      // false for paid plans

  // Window
  windowWidth: number;        // Default: 400
  windowHeight: number;       // Default: 600
}
```

### Widget Improvements from NY English Lessons

1. **Smooth animations** - Fade in/out, slide up
2. **Mobile optimization** - Full screen on mobile, proper keyboard handling
3. **Message persistence** - Store conversation in localStorage
4. **Typing indicators** - Show when AI is generating
5. **Error handling** - Graceful retry on network errors
6. **Accessibility** - ARIA labels, keyboard navigation
7. **Performance** - Lazy load, minimal bundle size

### Embed Code Generator

Update `/settings/embed` to generate:

```html
<!-- Converso Chat Widget -->
<script
  src="https://soyconverso.com/api/embed?id=BOT_ID"
  data-button-color="#20B2AA"
  data-position="bottom-right"
  data-language="es"
  data-welcome-message="Hola! Cómo puedo ayudarte?"
  async
></script>
```

---

## 10. SEO Requirements

### Technical SEO Checklist

1. **Meta Tags** - Each page needs:
   ```tsx
   export const metadata: Metadata = {
     title: 'Page Title | Converso',
     description: '...',
     openGraph: { ... },
     twitter: { ... },
   }
   ```

2. **Structured Data** - Add JSON-LD for:
   - Organization
   - SoftwareApplication
   - FAQPage (on pricing/docs)
   - BreadcrumbList

3. **Sitemap** - Generate `sitemap.xml` via Next.js

4. **Robots.txt** - Allow crawling of marketing pages

5. **Canonical URLs** - Set on all pages

6. **Alt Text** - All images need descriptive alt

7. **Heading Hierarchy** - One H1 per page, proper H2/H3 nesting

8. **Page Speed** - Target 90+ Lighthouse score
   - Optimize images (next/image)
   - Minimize JS bundle
   - Use font-display: swap

9. **Mobile-First** - Responsive design, touch-friendly

10. **Bilingual SEO**
    - Use `hreflang` tags
    - Create `/es/` routes for Spanish content OR
    - Use language toggle with same URLs (simpler)

### Target Keywords

**English:**
- AI chatbot for business
- Customer support chatbot
- Embed chatbot on website
- Bilingual chatbot

**Spanish:**
- Chatbot inteligencia artificial
- Chatbot para empresas Mexico
- Chatbot en español
- Asistente virtual para negocios

---

## 11. Internationalization (i18n)

### Approach

Use a simple translation system (not full i18n framework):

**File:** `lib/i18n/translations.ts`

```typescript
export const translations = {
  en: {
    hero: {
      title: 'AI that speaks your language',
      subtitle: 'Deploy intelligent chatbots that understand your business and delight your customers.',
      cta: 'Start free',
      demo: 'See demo',
    },
    nav: {
      pricing: 'Pricing',
      demo: 'Demo',
      docs: 'Docs',
      login: 'Log in',
      signup: 'Get Started',
    },
    // ... more translations
  },
  es: {
    hero: {
      title: 'AI que habla tu idioma',
      subtitle: 'Despliega chatbots inteligentes que entienden tu negocio y deleitan a tus clientes.',
      cta: 'Empieza gratis',
      demo: 'Ver demo',
    },
    nav: {
      pricing: 'Precios',
      demo: 'Demo',
      docs: 'Documentación',
      login: 'Iniciar sesión',
      signup: 'Comenzar',
    },
    // ... more translations
  },
} as const;
```

### Language Detection

1. Check URL param `?lang=es`
2. Check cookie `converso_lang`
3. Check browser `Accept-Language`
4. Default to `en`

### Language Toggle Component

Add to navbar - simple dropdown or button to switch language.

---

## 12. Implementation Phases

### Phase 1: Foundation (Priority: Immediate)

1. Update Tailwind config with new design system
2. Add typography (fonts, fluid sizing)
3. Update color scheme throughout
4. Create new database tables (Plan, Subscription, UsageRecord)
5. Update User and Membership schemas
6. Create permissions system

### Phase 2: Authentication with Clerk

1. Install Clerk: `pnpm add @clerk/nextjs svix`
2. Remove NextAuth: `pnpm remove next-auth bcrypt-ts`
3. Create Clerk middleware (`middleware.ts`)
4. Create Clerk webhook handler (`app/api/clerk/webhook/route.ts`)
5. Update User schema to reference `clerkUserId`
6. Create `/sign-in` and `/sign-up` pages with Clerk components
7. Create `lib/auth.ts` utility functions
8. Implement role-based access control
9. Create team invitation flow (use Clerk Organizations or custom)

### Phase 3: Stripe Integration

1. Install Stripe SDK: `pnpm add stripe @stripe/stripe-js`
2. Create Stripe utility (`lib/stripe.ts`)
3. Seed Plan table with tier data
4. Build checkout API route
5. Build webhook handler
6. Build customer portal route
7. Add subscription status to session

### Phase 4: Marketing Pages

1. Create `(marketing)` route group
2. Build landing page with all sections
3. Build pricing page
4. Update demo page
5. Add SEO metadata to all pages
6. Add structured data

### Phase 5: Dashboard & Settings

1. Create dashboard page
2. Refactor admin → settings
3. Add billing settings (Stripe portal)
4. Add team management UI
5. Add usage display

### Phase 6: Widget Enhancements

1. Update embed script with new options
2. Improve mobile experience
3. Add typing indicators
4. Add message persistence
5. Remove branding for paid plans

### Phase 7: Polish & Launch

1. Lighthouse optimization
2. Error monitoring (Sentry optional)
3. Analytics (Vercel Analytics)
4. Final testing across browsers
5. Production deployment

---

## 13. Environment Variables Required

```env
# ===========================================
# DATABASE (Neon)
# ===========================================
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# ===========================================
# AUTHENTICATION (Clerk)
# ===========================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Clerk routing
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ===========================================
# OPENAI
# ===========================================
OPENAI_API_KEY=sk-...

# ===========================================
# STRIPE
# ===========================================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ===========================================
# APPLICATION
# ===========================================
NEXT_PUBLIC_APP_URL=https://soyconverso.com

# ===========================================
# OPTIONAL
# ===========================================
# VERCEL_ANALYTICS_ID=...
```

### Where to Get Each Key

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Neon Console → Project → Connection Details |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → Create endpoint |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/apikeys |
| `STRIPE_PUBLISHABLE_KEY` | https://dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks or Stripe CLI |

---

## 14. File Structure (Target)

```
├── middleware.ts              # Clerk middleware (root level!)
│
app/
├── (auth)/
│   ├── sign-in/
│   │   └── [[...sign-in]]/page.tsx   # Clerk SignIn component
│   ├── sign-up/
│   │   └── [[...sign-up]]/page.tsx   # Clerk SignUp component
│   └── layout.tsx             # Auth layout (centered, minimal)
├── (marketing)/
│   ├── page.tsx               # Landing page
│   ├── pricing/page.tsx
│   ├── demo/page.tsx
│   ├── docs/page.tsx
│   └── layout.tsx             # Marketing layout (navbar, footer)
├── (app)/                     # Protected routes (Clerk middleware)
│   ├── dashboard/page.tsx
│   ├── chat/[id]/page.tsx
│   ├── settings/
│   │   ├── page.tsx           # General settings
│   │   ├── team/page.tsx
│   │   ├── billing/page.tsx
│   │   ├── bots/page.tsx
│   │   ├── knowledge/page.tsx
│   │   └── embed/page.tsx
│   └── layout.tsx             # App layout (sidebar)
├── api/
│   ├── clerk/
│   │   └── webhook/route.ts   # Clerk user sync webhook
│   ├── stripe/
│   │   ├── checkout/route.ts
│   │   ├── webhook/route.ts
│   │   └── portal/route.ts
│   └── ... (existing)
└── embed/
    └── chat/page.tsx

lib/
├── db/
│   ├── schema.ts              # Updated with new tables + clerkUserId
│   └── queries.ts             # Updated with new queries
├── auth.ts                    # Clerk utility functions (getDbUser, etc.)
├── stripe.ts                  # Stripe client
├── permissions.ts             # Role permissions
├── i18n/
│   └── translations.ts
└── ... (existing)

components/
├── marketing/
│   ├── navbar.tsx
│   ├── footer.tsx
│   ├── hero.tsx
│   ├── pricing-card.tsx
│   └── feature-grid.tsx
├── dashboard/
│   ├── sidebar.tsx
│   ├── usage-card.tsx
│   └── bot-list.tsx
└── ... (existing)
```

---

## 15. Commands to Run

```bash
# Install Clerk authentication
pnpm add @clerk/nextjs svix

# Install Stripe payments
pnpm add stripe @stripe/stripe-js

# Remove old NextAuth packages
pnpm remove next-auth bcrypt-ts @auth/core @auth/drizzle-adapter

# Generate Drizzle migrations after schema updates
pnpm db:generate

# Push schema to database
pnpm db:push

# Run development server
pnpm dev

# For Stripe webhook testing locally
# (Install Stripe CLI first: https://stripe.com/docs/stripe-cli)
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Summary

This specification transforms the existing codebase into **Converso**, a bilingual SaaS chatbot platform targeting the Mexico and North American markets.

### Tech Stack
- **Database:** Neon (serverless PostgreSQL)
- **Auth:** Clerk (replaces NextAuth)
- **Payments:** Stripe
- **AI:** OpenAI GPT-4o
- **Framework:** Next.js 15 + Drizzle ORM

### Key Deliverables

1. **New visual identity** - Cielito Lindo palette, Plus Jakarta Sans + Inter fonts
2. **Clerk authentication** - Managed auth with webhooks to sync users to our DB
3. **Proper multi-tenancy** - Owner/Admin/Member roles with permissions
4. **Stripe billing** - Free trial, 4 paid tiers, annual discount
5. **Marketing site** - SEO-optimized landing, pricing, demo pages
6. **Improved widget** - More customization, better mobile, branding removal for paid
7. **Bilingual throughout** - EN/ES with easy language switching

### Execution Order

1. **Phase 1:** Design system + database schema
2. **Phase 2:** Clerk authentication integration
3. **Phase 3:** Stripe payments integration
4. **Phase 4:** Marketing pages
5. **Phase 5:** Dashboard & settings
6. **Phase 6:** Widget enhancements
7. **Phase 7:** Polish & launch

Execute phases in order. Each phase should be testable independently before moving to the next.
