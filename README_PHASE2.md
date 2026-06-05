# SpendPass — Phase 2 Complete! 🚀

**Scoped Spending Delegation for AI Commerce Agents**

[![Phase 2](https://img.shields.io/badge/Phase%202-Complete-success)]()
[![Agent Auth](https://img.shields.io/badge/Agent%20Auth-Integrated-blue)]()
[![Terminal 3](https://img.shields.io/badge/Terminal%203-Hackathon-orange)]()

---

## What is SpendPass?

SpendPass demonstrates **constraint-based agent authorization** using [Agent Auth](https://github.com/better-auth/agent-auth). An AI shopping agent can search products, manage a cart, and checkout—but only within **explicitly granted spending limits** and **approved merchants**.

### The Problem

> "I want an AI agent to shop for me, but I don't want to give it unrestricted access to my credit card."

Traditional approaches:
- ❌ Give agent full payment API access (unsafe)
- ❌ Require approval for every action (tedious)
- ❌ No cryptographic identity (can't audit who did what)
- ❌ No revocation without breaking everything

### The SpendPass Solution

✅ **Scoped capabilities** — agent only has what you grant  
✅ **Spending caps** — enforced server-side with `max_amount` constraint  
✅ **Merchant allowlists** — only approved stores  
✅ **Escalation flow** — agent requests higher limits when needed  
✅ **Cryptographic identity** — every action tied to agent keypair  
✅ **Instant revocation** — disconnect agent without side effects  
✅ **Full audit trail** — complete history of what agent did  

---

## 🎯 Phase 2 Status

**Completed:** June 5, 2026

### ✅ What's Working

| Feature | Status | Description |
|---------|--------|-------------|
| **Agent Connection** | ✅ | Device approval flow with CIBA |
| **Product Search** | ✅ | Filter by keyword, category, price |
| **Cart Management** | ✅ | Add items, view totals |
| **Checkout** | ✅ | Create orders with constraint enforcement |
| **Spending Caps** | ✅ | Block purchases over `max_amount` |
| **Merchant Allowlist** | ✅ | Only approved merchants allowed |
| **Escalation** | ✅ | Agent requests higher limits |
| **Order Creation** | ✅ | Persist orders to database |
| **Audit Trail** | ✅ | All actions logged |

### 🔜 Phase 3 (Next)

- [ ] Dashboard UI (view agent, constraints, audit log)
- [ ] Revocation control (disconnect agent button)
- [ ] Order history view
- [ ] Demo video

---

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase account (free tier)
- Groq API key (free tier)

### Setup (5 minutes)

```bash
# Clone repository
git clone <your-repo>
cd veriagent

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase and Groq credentials

# Setup database
npm run db:push
npm run db:seed

# Verify setup
npm run verify

# Start dev server
npm run dev
```

Open http://localhost:3100

---

## Testing Phase 2

### Test 1: Under-Cap Purchase (Should Succeed)

1. Sign in and go to Chat
2. Say: **"Find USB-C hubs under $40"**
3. Approve agent in browser (first time only)
   - Default grant: $50 max, spendpass-store merchant
4. Say: **"Add the USB-C Hub 7-in-1 to my cart"**
5. Say: **"Checkout"**

**Expected:** ✅ Order placed successfully ($38.00)

---

### Test 2: Over-Cap Denial + Escalation

1. Continue in same session
2. Say: **"Find monitors around $120"**
3. Say: **"Add the [monitor] to my cart"**
4. Say: **"Checkout"**

**Expected:** 
- ❌ Denied: "Cart total $120.00 exceeds granted limit of $50.00"
- 🔄 Agent explains and requests $150 cap
- 📱 Browser opens re-approval flow
5. Approve new $150 cap
6. **Expected:** ✅ Order placed successfully ($120.00)

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│ User                                                  │
│  ├─ Chat UI (natural language)                        │
│  └─ Dashboard (Phase 3)                               │
└──────────────┬───────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────┐
│ Agent Client (@auth/agent)                            │
│  ├─ connect_agent (device approval)                   │
│  ├─ execute_capability (signed JWTs)                  │
│  └─ request_capability (escalation)                   │
└──────────────┬───────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────┐
│ AI Layer (Groq AI + Vercel AI SDK)                    │
│  ├─ llama-3.3-70b-versatile                           │
│  ├─ System prompt with escalation logic               │
│  └─ Tool use with Agent Auth capabilities             │
└──────────────┬───────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────┐
│ SpendPass Provider (@better-auth/agent-auth)          │
│  ├─ Capabilities: search, cart, checkout              │
│  ├─ Constraint Enforcement (max_amount, merchants)    │
│  ├─ Event logging (audit trail)                       │
│  └─ Agent identity management                         │
└──────────────┬───────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────┐
│ Supabase PostgreSQL (Drizzle ORM)                     │
│  ├─ Auth tables (users, sessions)                     │
│  ├─ Agent tables (agents, grants, approvals)          │
│  ├─ Store tables (products, cart, orders)             │
│  └─ Audit trail (event_log)                           │
└────────────────────────────────────────────────────────┘
```

---

## How Constraint Enforcement Works

### 1. Grant Structure

When user approves agent, they grant capabilities with constraints:

```json
{
  "capability": "checkout",
  "constraints": {
    "max_amount": { "max": 50 },
    "merchants": { "in": ["spendpass-store"] }
  }
}
```

### 2. Checkout Validation (Server-Side)

```typescript
// lib/auth.ts → onExecute → checkout
const cart = await getCart({ userId, agentId });
const cartTotal = cart.totalCents / 100;

// Parse constraints from grant
const constraints = JSON.parse(grant.constraints);
const maxAmount = constraints.max_amount?.max;

// Validate
if (cartTotal > maxAmount) {
  throw new Error(
    `CONSTRAINT_VIOLATION: Cart total $${cartTotal} exceeds limit $${maxAmount}`
  );
}

// If passed → create order
const order = await createOrder({ userId, agentId, totalCents, merchant });
```

### 3. Escalation Flow

```
Agent: execute_capability("checkout")
  ↓
Server: cartTotal ($120) > maxAmount ($50) ❌
  ↓
Server: Throw CONSTRAINT_VIOLATION
  ↓
Agent: Detect denial
  ↓
Agent: request_capability("checkout", { max_amount: 150 })
  ↓
Browser: Opens re-approval flow
  ↓
User: Approves $150 cap
  ↓
Agent: Retry execute_capability("checkout")
  ↓
Server: cartTotal ($120) ≤ maxAmount ($150) ✅
  ↓
Server: Create order, clear cart
```

---

## Key Features

### 🔐 Server-Side Constraint Enforcement

Constraints validated in `onExecute` handler — agent cannot bypass.

```typescript
// Constraints stored as JSON in database
const grant = agentSession.grants.find(g => g.capability === "checkout");
const constraints = JSON.parse(grant.constraints);

// Enforced before order creation
if (cartTotal > constraints.max_amount.max) {
  throw CONSTRAINT_VIOLATION;
}
```

### 🔄 Automatic Escalation

Agent detects denial and requests higher capability:

```typescript
// System prompt guides agent:
"When checkout fails with CONSTRAINT_VIOLATION:
1. Parse current total and limit
2. Explain to user
3. Calculate new limit (total + 20% buffer)
4. Call request_capability with higher max_amount
5. Guide user to approve in browser
6. Retry checkout"
```

### 📝 Complete Audit Trail

Every action logged to `event_log` table:

```sql
SELECT type, agent_id, data, created_at 
FROM event_log 
WHERE agent_id = 'agt_xxx'
ORDER BY created_at DESC;
```

Events captured:
- `agent.connected` — device approval
- `capability.executed` — search, cart, checkout
- `capability.denied` — constraint violations
- `capability.requested` — escalation requests

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Framework** | Next.js 16 | App Router, Server Actions |
| **Agent Auth** | @better-auth/agent-auth | Capability enforcement, constraints |
| **AI** | Groq (Llama 3.3 70B) | Fast inference, great tool use |
| **Database** | Supabase (PostgreSQL) | Production-ready, free tier |
| **ORM** | Drizzle | Type-safe SQL queries |
| **Auth** | Better Auth | Email/password + Agent Auth plugin |

---

## Project Structure

```
veriagent/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # AI chat with Agent Auth tools
│   │   ├── auth/[...all]/route.ts # Better Auth endpoints
│   │   ├── products/route.ts      # Product catalog API
│   │   └── logs/route.ts          # Audit log API
│   │
│   └── dashboard/
│       ├── chat/page.tsx          # Chat UI
│       ├── agents/page.tsx        # Agent management
│       └── hosts/page.tsx         # Host management
│
├── lib/
│   ├── auth.ts                    # Agent Auth configuration ⭐
│   ├── db.ts                      # Database operations ⭐
│   ├── agent/
│   │   ├── client.ts              # AgentAuthClient + system prompt ⭐
│   │   └── storage.ts             # File-based storage
│   │
│   ├── db/
│   │   ├── schema.ts              # PostgreSQL schema
│   │   └── index.ts               # Drizzle initialization
│   │
│   └── seed/
│       └── products.ts            # Demo product catalog
│
├── scripts/
│   ├── seed.ts                    # Database seeding
│   ├── verify-setup.ts            # Setup verification
│   └── test-phase2.ts             # Phase 2 tests
│
└── docs/
    ├── BUILD_TARGET.md            # Project specification
    ├── PHASE1_COMPLETION.md       # Phase 1 documentation
    ├── PHASE2_COMPLETION.md       # Phase 2 documentation ⭐
    ├── PHASE2_QUICK_GUIDE.md      # Quick testing guide ⭐
    └── SUPABASE_SETUP.md          # Supabase configuration

⭐ = Key Phase 2 files
```

---

## Environment Variables

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/postgres

# Better Auth
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3100
NEXT_PUBLIC_APP_URL=http://localhost:3100

# AI (Groq)
GROQ_API_KEY=gsk_your_key_here

# Optional: Encrypt agent keys
AGENT_AUTH_ENCRYPTION_KEY=<openssl rand -base64 32>
```

---

## Commands

```bash
# Development
npm run dev              # Start dev server (port 3100)
npm run build            # Production build
npm run start            # Start production server

# Database
npm run db:push          # Push schema to database
npm run db:seed          # Seed products (20 items)

# Testing
npm run verify           # Check setup (env, db, packages)
npm run test:phase2      # Run Phase 2 tests
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| **PHASE2_QUICK_GUIDE.md** | 5-minute testing guide |
| **PHASE2_COMPLETION.md** | Comprehensive technical docs |
| **PHASE2_SUMMARY.md** | Executive summary |
| **BUILD_TARGET.md** | Original project specification |
| **SUPABASE_SETUP.md** | Database configuration guide |

---

## Why Agent Auth?

### Without Agent Auth

```javascript
// Traditional approach: agent has API key
const stripe = new Stripe(process.env.STRIPE_KEY);

// Problems:
❌ No spending limits (agent can charge anything)
❌ No merchant restrictions (can charge anywhere)
❌ No escalation protocol (all-or-nothing access)
❌ No cryptographic identity (just a string)
❌ No audit trail (who authorized this charge?)
❌ No revocation (invalidating key breaks everything)
```

### With Agent Auth (SpendPass)

```javascript
// Agent has capability with constraints
{
  "capability": "checkout",
  "constraints": {
    "max_amount": { "max": 50 },
    "merchants": { "in": ["spendpass-store"] }
  },
  "agent_id": "agt_abc123...",
  "keypair": "ed25519..."
}

// Benefits:
✅ Spending cap enforced server-side
✅ Merchant allowlist checked before order
✅ Escalation protocol (request higher limits)
✅ Cryptographic identity (agt_* with keypair)
✅ Complete audit trail (every action logged)
✅ Instant revocation (disconnect_agent)
```

**Agent Auth is not optional plumbing** — it's the foundation of safe AI commerce.

---

## Hackathon Submission

**Event:** [Terminal 3 Agent Dev Kit Bounty](https://dorahacks.io/hackathon/t3adkdevchallengebeta/qa)  
**Deadline:** June 7, 2026  
**Current Status:** Phase 2 Complete (Constraint Enforcement Working)

### Demo Checklist

- [x] Phase 1: Foundation (agent connection, search, cart)
- [x] Phase 2: Constraints & escalation (checkout enforcement)
- [ ] Phase 3: Dashboard & revocation (UI polish)
- [ ] 90-second demo video
- [ ] GitHub repository published
- [ ] DoraHacks submission

---

## Contributing

SpendPass is a hackathon demo. Not accepting contributions until after submission (June 7, 2026).

After hackathon, roadmap includes:
- Multi-merchant checkout
- Payment processor integration (Stripe, Terminal 3)
- Custom constraint types (daily limits, category restrictions)
- Mobile app
- More AI models (OpenAI, Anthropic)

---

## License

MIT

---

## Contact

**Project:** SpendPass (demo app under VeriAgent umbrella)  
**Built for:** Terminal 3 Agent Dev Kit Hackathon  
**Phase 2 Complete:** June 5, 2026  

**Status:** ✅ Constraint enforcement working • 🔜 Dashboard UI next

---

**Test it now:** http://localhost:3100 🚀
