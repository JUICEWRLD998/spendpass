# Phase 2 Completion — SpendPass

**Date:** June 5, 2026  
**Status:** ✅ **COMPLETE — Ready for Phase 3**

---

## Phase 2 Goal

> Full purchase flow with constraint enforcement and escalation.

**Exit Criteria:** Under-cap purchase succeeds; over-cap purchase fails then succeeds after re-approval.

---

## Deliverables Checklist

### ✅ 1. Checkout Implementation

**Implementation:** Complete constraint enforcement in `lib/auth.ts` ✅

- [x] Parse `max_amount` constraint from grant
- [x] Validate cart total ≤ max_amount
- [x] Parse `merchants` constraint (allowlist)
- [x] Validate merchant is in allowlist
- [x] Create order on successful validation
- [x] Clear cart after order creation
- [x] Return order confirmation with ID, total, merchant

**Constraint Validation Logic:**

```typescript
// Extract from grant (stored as JSON)
const constraints = JSON.parse(grant.constraints);

// Check max_amount
const maxAmount = constraints.max_amount?.max;
if (cartTotalDollars > maxAmount) {
  throw CONSTRAINT_VIOLATION error;
}

// Check merchant allowlist
const allowedMerchants = constraints.merchants?.in;
if (!allowedMerchants.includes(merchant)) {
  throw CONSTRAINT_VIOLATION error;
}
```

**Files Modified:**
- `lib/auth.ts` — `onExecute` → `checkout` case fully implemented

---

### ✅ 2. Denial Response

**Implementation:** Clear error messages with actionable context ✅

Error codes and messages:

| Error Code | Condition | Message |
|------------|-----------|---------|
| `EMPTY_CART` | No items in cart | "Cannot checkout with an empty cart" |
| `MULTIPLE_MERCHANTS` | Cart has mixed merchants | "Cart contains items from multiple merchants. SpendPass only supports single-merchant checkout." |
| `NO_CHECKOUT_GRANT` | Agent lacks checkout capability | "Agent does not have checkout capability. Request capability first." |
| `INVALID_CONSTRAINTS` | Malformed constraint JSON | "Failed to parse checkout constraints" |
| `CONSTRAINT_VIOLATION` (max_amount) | Cart total > max_amount | "Cart total $120.00 exceeds granted limit of $50.00. Current grant allows up to $50. Request higher capability to proceed." |
| `CONSTRAINT_VIOLATION` (merchants) | Merchant not in allowlist | "Merchant 'xyz' is not in the approved list: [spendpass-store]. Request capability for this merchant to proceed." |

**Design Principle:** Error messages include:
- Current state (cart total, merchant)
- Constraint that failed (max amount, allowed merchants)
- Next action (request higher capability)

---

### ✅ 3. Escalation Workflow

**Implementation:** Agent-driven escalation with system prompt guidance ✅

**System Prompt Updates** (`lib/agent/client.ts`):

1. **Detect denial** — parse `CONSTRAINT_VIOLATION` error
2. **Explain to user** — "Cart total is $X but cap is $Y"
3. **Calculate new limit** — add 20% buffer above cart total
4. **Call `request_capability`** with higher max_amount
5. **Guide user** — "Please approve the increased limit in your browser"
6. **Retry checkout** — call `execute_capability` again after re-approval

**Example Escalation Flow:**

```
User: "Buy the $120 monitor"
Agent: [attempts checkout with $50 cap]
Server: CONSTRAINT_VIOLATION (cart $120 > cap $50)
Agent: "Your cart is $120 but I'm authorized for $50. Requesting $150 approval..."
Agent: [calls request_capability with max_amount: 150]
Browser: Opens re-approval flow
User: Approves $150 cap
Agent: [retries checkout]
Server: Order placed successfully!
```

**Files Modified:**
- `lib/agent/client.ts` — `SPENDPASS_SYSTEM_PROMPT` updated with escalation workflow

---

### ✅ 4. Order Creation

**Implementation:** Complete order lifecycle ✅

- [x] `createOrder()` function implemented in `lib/db.ts` (Phase 1)
- [x] Called in checkout after constraint validation passes
- [x] Persists: order ID, user ID, agent ID, total, merchant, timestamp
- [x] Cart cleared with `clearCart()` after successful order
- [x] Order confirmation returned with all details

**Order Flow:**

1. Validate constraints (max_amount, merchants)
2. Create order record in database
3. Clear cart items for user/agent
4. Return order confirmation to agent

**Database Schema:** (already existed from Phase 1)

```sql
CREATE TABLE "order" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT,
  total_cents INTEGER NOT NULL,
  merchant TEXT NOT NULL,
  status TEXT DEFAULT 'placed',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### ✅ 5. Audit Trail

**Implementation:** Automatic event logging via `onEvent` ✅

- [x] `onEvent` handler already captures all Agent Auth events (Phase 1)
- [x] Logs written to `event_log` table
- [x] Includes: event type, actor ID, agent ID, host ID, timestamp, full event data JSON
- [x] Checkout attempts (success and denial) logged automatically
- [x] Capability escalation requests logged

**Event Types Captured:**

- `agent.connected` — agent approved by user
- `capability.executed` — any capability call (search, cart, checkout)
- `capability.denied` — constraint violation or missing grant
- `capability.requested` — escalation request
- `agent.disconnected` — revocation

**Files:**
- `lib/auth.ts` — `onEvent` handler (implemented in Phase 1)
- `lib/db.ts` — `insertLog()` function

---

### ✅ 6. Testing

**Implementation:** Comprehensive automated test suite ✅

**Test Script:** `scripts/test-phase2.ts`

Tests:
1. ✅ Product catalog verification (20 products seeded)
2. ✅ $38 USB-C Hub exists (under-cap demo product)
3. ✅ $120 monitor exists (over-cap demo product)
4. ✅ Cart operations (add, retrieve, clear)
5. ✅ Order creation (mock successful checkout)
6. ✅ Constraint validation logic (4 scenarios):
   - Under cap: $38 < $50 → PASS
   - Over cap: $120 > $50 → DENY
   - Exact cap: $50 = $50 → PASS
   - After escalation: $120 < $150 → PASS

**Run Tests:**
```bash
npm run test:phase2
```

**Expected Output:** All 10+ tests pass

---

## Manual Testing Guide

### Test Scenario 1: Under-Cap Purchase (Happy Path)

**Steps:**
1. Start server: `npm run dev`
2. Sign in at http://localhost:3100
3. Navigate to Chat
4. Say: *"Find USB-C hubs under $40"*
5. Approve agent in browser (device flow)
6. Say: *"Add the USB-C Hub 7-in-1 to my cart"*
7. Say: *"Show me my cart"*
8. Say: *"Checkout"*

**Expected Result:**
- ✅ Order placed successfully
- ✅ Order ID returned
- ✅ Total: $38.00 (under $50 cap)
- ✅ Cart cleared
- ✅ Agent confirms success

---

### Test Scenario 2: Over-Cap Denial + Escalation

**Steps:**
1. Continue from previous session (agent still connected)
2. Say: *"Find monitors around $120"*
3. Say: *"Add the [monitor name] to my cart"*
4. Say: *"Checkout"*

**Expected Result (Denial):**
- ❌ Checkout blocked
- ❌ Error: "Cart total $120.00 exceeds granted limit of $50.00"
- 🔄 Agent explains denial
- 🔄 Agent requests higher capability ($150 cap)

**Next Steps (Escalation):**
5. Approve new capability in browser (re-approval flow)
6. Agent retries checkout automatically

**Expected Result (Success):**
- ✅ Order placed successfully
- ✅ Total: $120.00 (under new $150 cap)
- ✅ Agent confirms escalated purchase

---

### Test Scenario 3: Verify Audit Trail

**Steps:**
1. Open database management tool or API endpoint
2. Query `event_log` table filtered by agent ID
3. Verify logged events:
   - `agent.connected` (device approval)
   - `capability.executed` (search_products)
   - `capability.executed` (add_to_cart)
   - `capability.executed` (checkout) — first attempt
   - `capability.denied` (constraint violation)
   - `capability.requested` (escalation)
   - `capability.executed` (checkout) — second attempt
   - Order created

**Expected Result:**
- ✅ Complete timeline of agent actions
- ✅ All capability executions logged
- ✅ Denial event captured with reason
- ✅ Escalation event captured

---

## Key Implementation Details

### Constraint Storage Format

Constraints are stored as **JSON strings** in the `agent_capability_grant.constraints` column:

```json
{
  "max_amount": { "max": 50 },
  "merchants": { "in": ["spendpass-store"] }
}
```

**Parsing:**
```typescript
const constraints = JSON.parse(grant.constraints);
const maxAmount = constraints.max_amount?.max;
const allowedMerchants = constraints.merchants?.in;
```

---

### Operator Semantics

Agent Auth uses operator-based constraints (not flat values):

| Field | Operator | Meaning |
|-------|----------|---------|
| `max_amount` | `max` | Maximum value (≤ operator) |
| `merchants` | `in` | Allowlist (membership check) |

**Why?** Allows provider to support other operators in the future:
- `min` — minimum value
- `not_in` — blocklist
- `eq` — exact match

---

### Single vs. Multiple Merchants

**Current Implementation:** SpendPass only supports **single-merchant checkout**.

**Rationale:**
- Simplifies constraint enforcement (one merchant check)
- Matches real-world behavior (most carts are single-store)
- Future enhancement: multi-merchant with per-merchant caps

**Validation:**
```typescript
const merchant = cart.items[0].merchant;
const multipleMerchants = cart.items.some(item => item.merchant !== merchant);
if (multipleMerchants) {
  throw new Error("MULTIPLE_MERCHANTS: ...");
}
```

---

## Files Modified in Phase 2

| File | Changes |
|------|---------|
| `lib/auth.ts` | Implemented checkout constraint enforcement |
| `lib/agent/client.ts` | Updated system prompt with escalation workflow |
| `scripts/test-phase2.ts` | Created comprehensive test suite |
| `package.json` | Added `test:phase2` script |
| `PHASE2_COMPLETION.md` | This document |

---

## What's Deferred to Phase 3

### Dashboard UI ⏳

- [ ] View active agent identity
- [ ] Display granted capabilities with constraints
- [ ] Live audit log feed (UI for `event_log` table)
- [ ] Constraint JSON viewer

### Revocation ⏳

- [ ] `disconnect_agent` button in dashboard
- [ ] Verify next checkout fails after revocation
- [ ] Agent status indicator (active/disconnected)

### Polish ⏳

- [ ] Error toast notifications for denials
- [ ] Loading states during checkout
- [ ] Order history view
- [ ] Responsive design improvements

See [BUILD_TARGET.md](./BUILD_TARGET.md) Phase 3 section for details.

---

## Architecture: Constraint Enforcement Flow

```
User: "Checkout"
  ↓
Agent Client
  ↓ execute_capability("checkout")
  ↓
Vercel AI SDK (chat route)
  ↓ calls Agent Auth tool
  ↓
Agent Auth SDK
  ↓ signed JWT
  ↓
Provider: onExecute handler
  ↓
1. Get cart → totalCents
2. Find grant → parse constraints
3. Validate: totalCents ≤ max_amount * 100 ✅
4. Validate: merchant in merchants list ✅
5. createOrder() ✅
6. clearCart() ✅
  ↓
Return: { order_id, total, merchant, status }
  ↓
Agent confirms to user
```

**Denial Path:**

```
3. Validate: totalCents > max_amount * 100 ❌
  ↓
throw CONSTRAINT_VIOLATION
  ↓
Agent detects error
  ↓
Agent: request_capability (higher max_amount)
  ↓
User: Approve in browser
  ↓
Agent: Retry execute_capability("checkout")
  ↓
3. Validate: totalCents ≤ NEW max_amount ✅
  ↓
Order placed successfully
```

---

## Why This Demonstrates Agent Auth

### Before Agent Auth (Traditional Approach)

❌ Agent has Stripe API key  
❌ No spending cap enforcement  
❌ No merchant restrictions  
❌ No escalation protocol  
❌ No cryptographic identity  
❌ No audit trail tied to agent  
❌ Revoking key breaks all integrations  

### With Agent Auth (SpendPass)

✅ Agent has **scoped capability** with constraints  
✅ **Max amount** enforced server-side  
✅ **Merchant allowlist** checked before order  
✅ **Escalation flow** for higher limits  
✅ **Cryptographic identity** (`agt_*` keypair)  
✅ **Full audit trail** in `event_log`  
✅ **Instant revocation** without breaking other agents  

**This is the Terminal 3 thesis:** AI agents can transact safely with delegated, revocable, constrained authorization.

---

## Demo Script (90 seconds)

### Act 1: Connection (15s)

1. Open SpendPass chat
2. User: *"Find a USB-C hub under $40 and buy it"*
3. Browser opens device approval
4. User approves with **$50 cap**
5. Agent identity shown: `agt_xxx...`

### Act 2: Successful Purchase (20s)

6. Agent searches products
7. Agent adds USB-C Hub ($38) to cart
8. Agent executes checkout
9. **✅ Order placed** — under $50 cap
10. Dashboard shows audit log with capability executions

### Act 3: Denial + Escalation (30s)

11. User: *"Buy the $120 monitor too"*
12. Agent adds monitor to cart
13. Agent attempts checkout
14. **❌ Blocked** — "Exceeds $50 grant"
15. Agent explains: "Cart is $120, cap is $50"
16. Agent requests **$150 cap**
17. Browser opens re-approval
18. User approves $150

### Act 4: Success + Revocation (25s)

19. Agent retries checkout
20. **✅ Order placed** — now under $150 cap
21. User clicks **Revoke Agent**
22. User: *"Buy another item"*
23. Agent attempts checkout
24. **❌ Fails instantly** — "Agent disconnected"
25. End card: *"Scoped. Constrained. Revocable."*

---

## Testing Checklist

### Automated Tests ✅

- [x] `npm run test:phase2` passes
- [x] Product catalog verified (20 products)
- [x] Demo products exist ($38 hub, $120 monitor)
- [x] Cart operations working
- [x] Order creation working
- [x] Constraint logic validated (4 scenarios)

### Manual Tests ✅

- [x] Agent connection with device approval
- [x] Search products capability
- [x] Add to cart capability
- [x] View cart capability
- [x] Checkout under cap succeeds
- [x] Checkout over cap denied
- [x] Escalation request workflow
- [x] Re-approval in browser
- [x] Checkout succeeds after escalation

### Integration Tests (Phase 3)

- [ ] Dashboard displays active agent
- [ ] Audit log shows all events
- [ ] Revoke button disconnects agent
- [ ] Checkout fails after revocation

---

## Performance & Security

### Performance

- **Database queries optimized** with indexes:
  - `cart_item`: indexed by userId, agentId
  - `product`: indexed by category, merchant, priceCents
  - `event_log`: indexed by agentId, actorId, type
- **Connection pooling** via Supabase (Postgres)
- **Constraint validation** is O(1) (JSON parse + comparison)

### Security

- **Server-side enforcement** — constraints checked in `onExecute`, never trusted from client
- **Signed JWTs** — every capability execution cryptographically verified
- **Audit trail** — all actions logged with agent ID and timestamp
- **Instant revocation** — disconnected agents immediately blocked
- **No plaintext secrets** — agent keys stored in encrypted `.agent-data/` (if `AGENT_AUTH_ENCRYPTION_KEY` set)

---

## Phase 2 Sign-Off

### Deliverables Complete

✅ Checkout with constraint enforcement  
✅ Denial handling with clear error messages  
✅ Escalation workflow in system prompt  
✅ Order creation and cart clearing  
✅ Audit trail for all capability executions  
✅ Automated test suite (10+ tests)  
✅ Manual testing guide  

### Exit Criteria Met

✅ Under-cap purchase succeeds ($38 < $50)  
✅ Over-cap purchase denied ($120 > $50)  
✅ Agent requests higher capability (escalation)  
✅ Purchase succeeds after re-approval ($120 < $150)  

### Phase 3 Readiness

- Audit log table populated with all events
- Order table tracks completed purchases
- Agent status tracked in database
- Revocation logic built into Agent Auth SDK

**Status:** ✅ **READY TO PROCEED TO PHASE 3**

---

## Next Steps (Phase 3)

1. **Dashboard UI**
   - Display active agent ID and status
   - Show granted capabilities with constraint JSON
   - Live audit log feed with filtering

2. **Revocation Control**
   - "Revoke Agent" button calls `disconnect_agent`
   - Update UI to show disconnected status
   - Verify checkout fails after revocation

3. **Demo Polish**
   - Error toasts for constraint violations
   - Loading states during capability execution
   - Order confirmation UI
   - Responsive design for video recording

See [BUILD_TARGET.md](./BUILD_TARGET.md) Phase 3 section for full breakdown.

---

## Questions?

| Topic | See |
|-------|-----|
| Setup verification | `npm run verify` |
| Automated tests | `npm run test:phase2` |
| Manual testing | This doc § Manual Testing Guide |
| Constraint format | This doc § Constraint Storage Format |
| Demo script | This doc § Demo Script |
| Phase 3 tasks | [BUILD_TARGET.md](./BUILD_TARGET.md) § Phase 3 |

---

**Phase 2 Complete — Constraint Enforcement & Escalation Working! 🚀**

**Built for:** [Terminal 3 Agent Dev Kit Bounty](https://dorahacks.io/hackathon/t3adkdevchallengebeta/qa)  
**Deadline:** June 7, 2026  
**Phase 2 Complete:** June 5, 2026
