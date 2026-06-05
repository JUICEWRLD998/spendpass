# Phase 2 Quick Testing Guide

**Status:** ✅ Phase 2 Complete — Checkout with Constraints Working!

---

## What's New in Phase 2

✅ **Checkout capability fully implemented** with constraint enforcement  
✅ **Spending caps enforced** — purchases blocked if over limit  
✅ **Merchant allowlist enforced** — only approved merchants allowed  
✅ **Escalation workflow** — agent requests higher limits when needed  
✅ **Order creation** — successful purchases persisted to database  
✅ **Cart clearing** — cart emptied after successful order  
✅ **Detailed error messages** — clear guidance on what went wrong  

---

## Quick Test (5 minutes)

### Prerequisites
```bash
# Server should be running
npm run dev

# Open browser to:
http://localhost:3100
```

### Test 1: Under-Cap Purchase (Should Succeed ✅)

1. **Sign in** (create account if needed)
2. **Go to Chat** tab
3. Type: `Find USB-C hubs under $40`
4. **Approve agent** in browser popup (if first time)
   - Default grant: $50 max, spendpass-store merchant
5. Type: `Add the USB-C Hub 7-in-1 to my cart`
6. Type: `Show my cart`
7. Type: `Checkout`

**Expected Result:**
```
✅ Order placed successfully!
Order ID: abc123
Total: $38.00
Merchant: spendpass-store
```

---

### Test 2: Over-Cap Purchase (Should Deny ❌ then Escalate 🔄)

1. **Continue in same chat session**
2. Type: `Find monitors around $120`
3. Type: `Add the [monitor name] to my cart`
4. Type: `Checkout`

**Expected Result (Denial):**
```
❌ Checkout blocked
Error: Cart total $120.00 exceeds granted limit of $50.00

Agent explains:
"Your cart is $120 but I'm only authorized to spend up to $50. 
I'm requesting approval to increase the limit to $150. 
Please approve in the browser window."
```

5. **Browser opens re-approval flow**
6. **Approve new $150 cap**

**Expected Result (Success):**
```
✅ Order placed successfully!
Order ID: def456
Total: $120.00
Merchant: spendpass-store
```

---

## Constraint Enforcement Details

### Current Default Grant

When you first approve the agent, you grant:

```json
{
  "max_amount": { "max": 50 },
  "merchants": { "in": ["spendpass-store"] }
}
```

**Meaning:**
- Agent can spend up to **$50** per checkout
- Only from **spendpass-store** merchant

### Validation Rules

| Check | Rule | Action on Failure |
|-------|------|-------------------|
| **Cart not empty** | items.length > 0 | Error: EMPTY_CART |
| **Single merchant** | All items same merchant | Error: MULTIPLE_MERCHANTS |
| **Max amount** | cart total ≤ max_amount | Error: CONSTRAINT_VIOLATION |
| **Merchant allowlist** | merchant in allowed list | Error: CONSTRAINT_VIOLATION |

### Error Messages

All errors include:
- **What failed** (which constraint)
- **Current state** (cart total, merchant)
- **Next action** (request higher capability)

Example:
```
CONSTRAINT_VIOLATION: Cart total $120.00 exceeds granted limit of $50.00. 
Current grant allows up to $50. Request higher capability to proceed.
```

---

## Troubleshooting

### Issue: "Agent not connected"

**Solution:** Type: `Connect to SpendPass and help me shop`

Agent will initiate device approval flow.

---

### Issue: "EMPTY_CART error"

**Solution:** Add items first:
```
Find USB-C hubs
Add the USB-C Hub to my cart
Checkout
```

---

### Issue: "NO_CHECKOUT_GRANT error"

**Solution:** Reconnect agent with checkout capability:
```
Connect again and request checkout capability with $50 cap
```

---

### Issue: Checkout succeeds but over the cap

**Problem:** This should NOT happen — constraint enforcement is broken.

**Debug:**
1. Check `agent_capability_grant` table for constraints JSON
2. Verify `lib/auth.ts` checkout case is parsing constraints correctly
3. Check server logs for errors

---

## Demo Products

### Under-Cap ($50 limit)

| Product | Price | Category | SKU |
|---------|-------|----------|-----|
| USB-C Hub 7-in-1 | $38.00 | hubs | HUB-7IN1-001 |
| USB-C to HDMI Cable | $24.99 | cables | CABLE-HDMI-001 |
| USB-C Charging Cable 2m | $19.99 | cables | CABLE-CHG-002 |
| Laptop Stand Aluminum | $45.00 | accessories | ACC-STAND-001 |

### Over-Cap (for escalation testing)

| Product | Price | Category | SKU |
|---------|-------|----------|-----|
| 4K Monitor 27" | $299.00 | monitors | MON-4K-001 |
| Portable Monitor 15.6" | $199.00 | monitors | MON-PORT-002 |
| USB-C Docking Station | $120.00 | hubs | DOCK-USBC-PRO |

---

## Escalation Workflow Explained

```
User: "Buy the $120 docking station"
  ↓
Agent: execute_capability("checkout")
  ↓
Provider: Check constraints
  - Cart total: $120.00
  - Max amount: $50.00
  - $120 > $50 ❌
  ↓
Provider: Throw CONSTRAINT_VIOLATION
  ↓
Agent: Detect denial in error message
  ↓
Agent: Explain to user
  "Cart is $120 but cap is $50"
  ↓
Agent: Calculate new limit
  $120 + 20% buffer = $150
  ↓
Agent: request_capability("checkout", constraints: { max_amount: 150 })
  ↓
Browser: Opens re-approval flow
  ↓
User: Approves $150 cap
  ↓
Provider: Updates grant with new constraints
  ↓
Agent: Retry execute_capability("checkout")
  ↓
Provider: Check constraints
  - Cart total: $120.00
  - Max amount: $150.00
  - $120 ≤ $150 ✅
  ↓
Provider: Create order, clear cart
  ↓
Agent: Confirm to user
  "Order placed! Total: $120.00"
```

---

## Verification Checklist

Before testing:

- [ ] Dev server running on port 3100
- [ ] Database has 20 products (`npm run db:seed`)
- [ ] `.env` configured correctly
- [ ] User account created

During testing:

- [ ] Agent connection works (device approval)
- [ ] Search products returns results
- [ ] Add to cart updates quantities
- [ ] Get cart shows totals
- [ ] Checkout under $50 succeeds
- [ ] Checkout over $50 denied
- [ ] Agent requests escalation
- [ ] Re-approval flow opens in browser
- [ ] Checkout succeeds after escalation

After testing:

- [ ] Orders visible in database
- [ ] Cart cleared after orders
- [ ] Event log shows all actions
- [ ] Multiple purchases work (cart refills)

---

## Database Verification

Check that orders were created:

```sql
-- View recent orders
SELECT 
  id, 
  user_id, 
  agent_id, 
  total_cents / 100.0 as total_dollars, 
  merchant, 
  status, 
  created_at 
FROM "order" 
ORDER BY created_at DESC 
LIMIT 10;
```

Check event log:

```sql
-- View agent actions
SELECT 
  type, 
  agent_id, 
  data, 
  created_at 
FROM event_log 
WHERE agent_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## Next Steps

✅ **Phase 2 Complete** — Checkout constraint enforcement working

🔜 **Phase 3** — Dashboard & Revocation:
- View active agent with granted capabilities
- Live audit log feed
- Revoke button to disconnect agent
- Verify checkout fails after revocation

See `BUILD_TARGET.md` for Phase 3 details.

---

## Key Files Modified

| File | Changes |
|------|---------|
| `lib/auth.ts` | Checkout implementation with constraint enforcement |
| `lib/agent/client.ts` | Updated system prompt with escalation workflow |
| `scripts/test-phase2.ts` | Automated test suite |
| `package.json` | Added `test:phase2` script |

---

## Success Criteria

Phase 2 is complete when:

✅ Under-cap purchase ($38) succeeds without re-approval  
✅ Over-cap purchase ($120) denied with clear error  
✅ Agent automatically requests escalation  
✅ Re-approval flow opens in browser  
✅ Purchase succeeds after re-approval  
✅ Orders persisted to database  
✅ Cart cleared after successful checkout  
✅ All actions logged to event_log  

---

**Phase 2 Status: ✅ COMPLETE**

**Test it now:** http://localhost:3100

**Questions?** See `PHASE2_COMPLETION.md` for comprehensive documentation.
