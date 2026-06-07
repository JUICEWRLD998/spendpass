# SpendPass — Quick Testing Guide

**Simple step-by-step guide to test everything works.**

---

## Prerequisites

1. Server running: `npm run dev`
2. Open browser: http://localhost:3100

---

## Test Flow

### 1. Sign Up

**URL:** http://localhost:3100

**Steps:**
1. Click "Sign Up"
2. Email: `test@example.com`
3. Password: `password123`
4. Click "Create Account"

**✅ Success:** You're redirected to dashboard showing products

---

### 2. Browse Products

**URL:** http://localhost:3100/dashboard (auto-redirected)

**What to see:**
- Grid of 20 products
- Categories: hubs, monitors, cables, accessories
- Prices ranging from $9.99 to $349

**Try:**
- Search for "USB"
- Filter by category "hubs"

**✅ Success:** Products filter correctly

---

### 3. Connect Agent

**URL:** http://localhost:3100/dashboard/chat

**Steps:**
1. Click "Agent" in navigation
2. Type: `Find USB-C hubs under $40`
3. Press Enter
4. **Browser opens approval page** (new tab/window)
5. Review capabilities (4 shown)
6. See constraint: "Maximum order: $50"
7. Click **"Approve"**

**✅ Success:** 
- Approval window closes
- Chat shows: "Agent connected"
- Products appear in chat

---

### 4. View Delegation Dashboard

**URL:** http://localhost:3100/dashboard/delegation

**Steps:**
1. Click "Delegation" in navigation

**What to see:**

- **Agent Card:** Name, green "Active" status, agent ID
- **Capabilities:** 4 listed (search_products, add_to_cart, get_cart, checkout)
- **Constraints:** `max_amount: ≤ $50`, `merchants: spendpass-store`
- **Activity Log:** Shows "Connected to provider"
- **Revoke Button:** Red card at bottom

**✅ Success:** Everything displays correctly

---

### 5. Add to Cart

**URL:** http://localhost:3100/dashboard/chat

**Steps:**
1. Type: `Add the USB-C Hub 7-in-1 to my cart`
2. Press Enter

**✅ Success:** Agent confirms added, shows $38.00

---

### 6. Check Activity Log

**URL:** http://localhost:3100/dashboard/delegation

**Steps:**
1. Go to Delegation page
2. Look at Activity Log (right side)

**What to see:**
- Event: "Executed 'add_to_cart'"
- Click event to expand → see full JSON

**✅ Success:** Event appears with timestamp

---

### 7. Checkout Under Cap ($38 < $50)

**URL:** http://localhost:3100/dashboard/chat

**Steps:**
1. Type: `Show my cart`
2. Verify total: $38.00
3. Type: `Checkout`

**✅ Success:** 
- Order placed
- Order ID shown
- Total: $38.00

---

### 8. Try Over Cap ($120 > $50)

**URL:** http://localhost:3100/dashboard/chat

**Steps:**
1. Type: `Find monitors around $120`
2. Type: `Add the [monitor name] to my cart`
3. Type: `Checkout`

**✅ Success:** 
- ❌ Checkout DENIED
- Error: "Cart total $120.00 exceeds granted limit of $50.00"
- Agent suggests requesting higher limit

---

### 9. Escalate to $150

**URL:** Browser will auto-open approval page

**Steps:**
1. Agent says: "Requesting approval for $150 cap"
2. **Browser opens re-approval page**
3. See new constraint: "Maximum order: $150"
4. Click **"Approve"**
5. Agent automatically retries

**✅ Success:** 
- Order placed
- Total: $120.00

**Check Delegation:**
- Constraint updated to: `max_amount: ≤ $150`

---

### 10. Revoke Agent

**URL:** http://localhost:3100/dashboard/delegation

**Steps:**
1. Scroll to red "Revoke Agent Access" card
2. Click **"Revoke Agent Now"**
3. Confirm in alert

**✅ Success:** 
- Alert: "Agent revoked successfully"
- Dashboard shows: "No Active Agents"

**Verify:**
- Go to Chat
- Try: `Search for cables`
- ❌ Agent reports: "Disconnected" or "Not connected"

---

## What Each Page Does

### `/dashboard` — Product Catalog
Browse 20 demo products, filter by category

### `/dashboard/chat` — AI Agent
Chat with shopping agent, connects via Agent Auth

### `/dashboard/delegation` — Control Panel
View agent permissions, constraints, activity log, revoke access

### `/dashboard/agents` — Agent List
See all agents (active, revoked, etc.)

### `/dashboard/hosts` — Host List
See host identities (advanced)

---

## Quick Troubleshooting

**Agent approval doesn't open?**
→ Allow popups in browser

**No products?**
→ Run `npm run db:seed`

**Checkout succeeds when it shouldn't?**
→ Check delegation dashboard for actual constraints

**Activity log not updating?**
→ Click "Live/Paused" toggle to enable auto-refresh

---

## Summary

✅ Sign up → ✅ Browse → ✅ Connect agent → ✅ View delegation → ✅ Add to cart → ✅ Check activity → ✅ Checkout under cap → ✅ Denied over cap → ✅ Escalate → ✅ Revoke

**Total time:** ~5 minutes

**Key demo moments:**
1. Agent connection (device approval)
2. Delegation dashboard (constraints visible)
3. Over-cap denial ($120 > $50)
4. Escalation (re-approve for $150)
5. Revocation (instant disconnect)

That's it! You now know how SpendPass works. 🚀
