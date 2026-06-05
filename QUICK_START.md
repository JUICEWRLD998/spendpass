# SpendPass — Quick Start Guide

**Ready to run in 5 minutes!**

---

## What You Need

1. ✅ Supabase account (free)
2. ✅ Groq API key (free)
3. ✅ Node.js 20+ installed

---

## Setup Steps

### 1. Get Your Supabase Connection String

1. Go to https://supabase.com and create a project
2. Wait 2 minutes for database to initialize
3. Go to **Project Settings** → **Database** → **Connection string**
4. Select **URI mode**
5. Copy the connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with your actual database password

### 2. Get Your Groq API Key

1. Go to https://console.groq.com/keys
2. Sign up or log in
3. Click **Create API Key**
4. Name it "SpendPass"
5. Copy the key (starts with `gsk_`)

### 3. Configure Environment

Edit `c:\Users\fadhm\Desktop\veriagent\.env` and set:

```env
# Paste your Supabase connection string
DATABASE_URL=postgresql://postgres:YourPassword@db.xxx.supabase.co:5432/postgres

# Generate this with: openssl rand -base64 32
BETTER_AUTH_SECRET=your-generated-secret-here

# Keep these as-is for local development
BETTER_AUTH_URL=http://localhost:3100
NEXT_PUBLIC_APP_URL=http://localhost:3100

# Paste your Groq API key
GROQ_API_KEY=gsk_your_groq_key_here
```

To generate `BETTER_AUTH_SECRET`, run:
```bash
openssl rand -base64 32
```

### 4. Install and Initialize

```bash
cd c:\Users\fadhm\Desktop\veriagent
npm install
npm run db:push
npm run db:seed
```

### 5. Run!

```bash
npm run dev
```

Open http://localhost:3100

---

## Test the Agent

1. **Sign up**
   - Click "Sign Up"
   - Enter email + password
   - Log in

2. **Go to Chat**
   - Click "Chat" or "Agents" in the navigation

3. **Start Shopping**
   - Type: *"Find USB-C hubs under $40"*
   - Agent will ask you to approve via device flow
   - A new browser window opens
   - Click **Approve**

4. **See Results**
   - Agent searches the catalog
   - Returns product names, prices, IDs

5. **Try Adding to Cart**
   - Type: *"Add the USB-C Hub 7-in-1 to my cart"*
   - Agent adds item
   - Type: *"Show me my cart"*
   - Agent displays cart with total

---

## Troubleshooting

### "Could not connect to database"
- Check your `DATABASE_URL` in `.env`
- Make sure you replaced `[YOUR-PASSWORD]` with actual password
- Verify your Supabase project is active (green in dashboard)

### "GROQ_API_KEY is not configured"
- Check your `.env` file has `GROQ_API_KEY=gsk_...`
- Get your key from https://console.groq.com/keys

### "No tables found"
- Run `npm run db:push` to create tables
- Check output for errors

### "No products found"
- Run `npm run db:seed` to add 20 products
- Should output: "Seeding 20 products... Seed complete."

### "Agent not connecting"
- Ensure `BETTER_AUTH_URL=http://localhost:3100` in `.env`
- Make sure dev server is running on port 3100

---

## What's Working (Phase 1)

✅ Agent Auth device approval flow  
✅ Product search with filters  
✅ Cart management (add, get, update)  
✅ Audit event logging  
✅ Groq AI with tool use  

## What's Coming (Phase 2)

⏳ Checkout with spending constraints ($50 cap)  
⏳ Denial when over cap  
⏳ Escalation flow (request higher cap)  
⏳ Order creation  

---

## Need More Detail?

- **Full setup guide:** [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- **Phase 1 report:** [PHASE1_COMPLETION.md](./PHASE1_COMPLETION.md)
- **Project roadmap:** [BUILD_TARGET.md](./BUILD_TARGET.md)
- **What changed:** [CHANGES.md](./CHANGES.md)

---

**Phase 1 Complete — Ready to Build Phase 2! 🚀**
