# Supabase Setup Guide for SpendPass

This guide walks you through setting up Supabase as your database for SpendPass.

## Why Supabase?

Supabase provides:
- Managed PostgreSQL database (no local setup needed)
- Free tier perfect for development and demos
- Built-in connection pooling and security
- Easy database management UI
- Production-ready scalability

---

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click **"New Project"**
4. Fill in project details:
   - **Name:** `spendpass` (or any name you prefer)
   - **Database Password:** Generate a strong password (save this!)
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free tier is perfect
5. Click **"Create new project"**
6. Wait 2-3 minutes for your database to initialize

---

## Step 2: Get Your Database Connection String

1. In your Supabase project dashboard, click **"Project Settings"** (gear icon in sidebar)
2. Navigate to **"Database"** section
3. Scroll to **"Connection string"**
4. Select **"URI"** mode (not the other modes)
5. Copy the connection string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
6. **Replace `[YOUR-PASSWORD]`** with the database password you created in Step 1

---

## Step 3: Update Your `.env` File

1. Open `c:\Users\fadhm\Desktop\veriagent\.env`
2. Update the `DATABASE_URL` line with your connection string:
   ```env
   DATABASE_URL=postgresql://postgres:YourActualPassword123@db.abcdefghijklmn.supabase.co:5432/postgres
   ```
3. Generate a secret for Better Auth:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and set it as `BETTER_AUTH_SECRET`

4. Add your Groq API key (see next section)

---

## Step 4: Get Your Groq API Key

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Navigate to **"API Keys"** in the sidebar
4. Click **"Create API Key"**
5. Give it a name like "SpendPass Dev"
6. Copy the API key
7. Add it to your `.env` file:
   ```env
   GROQ_API_KEY=gsk_YourGroqApiKeyHere123...
   ```

---

## Step 5: Complete `.env` Configuration

Your final `.env` file should look like:

```env
# Supabase Database connection string
DATABASE_URL=postgresql://postgres:YourActualPassword123@db.abcdefghijklmn.supabase.co:5432/postgres

# Better Auth secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-generated-32-byte-secret-here

# App URLs
BETTER_AUTH_URL=http://localhost:3100
NEXT_PUBLIC_APP_URL=http://localhost:3100

# Groq AI API key
GROQ_API_KEY=gsk_YourGroqApiKeyHere123...

# Optional: Encrypts agent private keys
AGENT_AUTH_ENCRYPTION_KEY=
```

---

## Step 6: Initialize the Database

Now that your Supabase database is connected, run these commands to set up tables and seed data:

```bash
# Install dependencies (including new Groq SDK)
npm install

# Push database schema to Supabase
npm run db:push

# Seed with product catalog
npm run db:seed
```

---

## Step 7: Verify Setup

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3100](http://localhost:3100)

3. Create an account (email + password)

4. Navigate to the **Agents** or **Chat** tab

5. Try asking the agent: *"Find USB-C hubs under $40"*

6. You should see the device approval flow kick in

---

## Checking Your Database in Supabase

You can view your data directly in Supabase:

1. Go to your Supabase project dashboard
2. Click **"Table Editor"** in the sidebar
3. You'll see all the tables created by Drizzle:
   - `user`, `session`, `account` (auth tables)
   - `agent`, `agent_host`, `agent_capability_grant` (Agent Auth tables)
   - `product`, `cart_item`, `order` (SpendPass store tables)
   - `event_log` (audit trail)

---

## Troubleshooting

### Connection Issues

If you see "connection refused" or "could not connect":
- Check your `DATABASE_URL` has the correct password
- Ensure you're using the **URI mode** connection string (not Session or Transaction mode)
- Verify your Supabase project is active (green status in dashboard)

### SSL Certificate Errors

If you see SSL-related errors, add this to your connection string:
```
?sslmode=require
```

Example:
```env
DATABASE_URL=postgresql://postgres:pass@db.abc.supabase.co:5432/postgres?sslmode=require
```

### Tables Not Created

If `npm run db:push` fails:
- Check your connection string is correct
- Ensure your Supabase project is fully initialized (wait 2-3 minutes after creation)
- Check the Drizzle output for specific errors

### Groq API Rate Limits

Groq's free tier has generous limits, but if you hit them:
- Wait a few minutes and try again
- Consider using a different model (update `app/api/chat/route.ts` line with `groq("llama-3.3-70b-versatile")`)
- Check your usage at [https://console.groq.com](https://console.groq.com)

---

## Production Considerations

When deploying SpendPass:

1. **Use Connection Pooling:** Supabase provides a pooling URL for serverless environments:
   - In Supabase dashboard > Settings > Database
   - Look for "Connection string" > "Session" mode
   - Use this for production deploys (Vercel, etc.)

2. **Enable Row Level Security (RLS):**
   - Supabase dashboard > Authentication > Policies
   - Add policies to protect user data

3. **Set Up Backups:**
   - Supabase Pro tier includes automated backups
   - Free tier: export data regularly via SQL dumps

4. **Environment Variables:**
   - Never commit `.env` to version control
   - Set environment variables in your deployment platform

---

## Why Not Local PostgreSQL?

Supabase is recommended over local PostgreSQL because:
- ✅ No local database installation needed
- ✅ Works the same on Windows, Mac, Linux
- ✅ Ready for production deployment
- ✅ Built-in backup and management tools
- ✅ Free tier sufficient for hackathon demo

---

## Next Steps

Once setup is complete, you're ready for **Phase 2** development:
- Implement checkout constraint enforcement
- Add escalation flow
- Build delegation dashboard

Refer to [BUILD_TARGET.md](./BUILD_TARGET.md) for the full roadmap.
