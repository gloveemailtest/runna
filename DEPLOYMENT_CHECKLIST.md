# Deployment Checklist - Make Sure Everything Works

## 🎯 Understanding Your Architecture

- **Vercel** = Frontend (React app) - what users see in the browser
- **Supabase** = Backend (Database + Edge Functions) - handles data and AI generation

When you click "Generate AI Workout":
1. Frontend (Vercel) calls Supabase edge function
2. Edge function (Supabase) calls AI API
3. Edge function saves workout to database (Supabase)
4. Frontend (Vercel) shows the workout

---

## ✅ Step 1: Verify Vercel Setup (Frontend)

### Check Environment Variables in Vercel:

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Make sure these are set:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Your Supabase anon/public key

### How to find your Supabase keys:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use for `VITE_SUPABASE_URL`
   - **anon public** key → Use for `VITE_SUPABASE_PUBLISHABLE_KEY`

### After adding/updating env vars:
- **Redeploy** your Vercel app (or it will auto-redeploy on next push)

---

## ✅ Step 2: Verify Supabase Edge Function Setup

### A. Deploy the Edge Function:

**Option 1: Using Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions**
4. Check if `generate-strength-plan` is listed
5. If not deployed, you need to deploy it via CLI (see below)

**Option 2: Using Supabase CLI** (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project (use project ref from supabase/config.toml)
supabase link --project-ref srvekoqxnxljknmrfyis

# Deploy the function
supabase functions deploy generate-strength-plan
```

### B. Set Environment Variable in Supabase:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Click **Add Secret**
5. Add:
   - **Name**: `LOVABLE_API_KEY`
   - **Value**: Your Lovable API key
6. Click **Save**

### C. Verify Function is Working:

1. In Supabase Dashboard → **Edge Functions** → `generate-strength-plan`
2. Click on the function
3. Check the **Logs** tab to see if there are any errors
4. Try invoking it manually to test

---

## ✅ Step 3: Test Everything

### Test Checklist:

1. **Frontend loads** ✅
   - Visit your Vercel URL
   - App should load without errors

2. **Authentication works** ✅
   - Sign up/Sign in
   - Should redirect to dashboard

3. **Database connection works** ✅
   - Go to Dashboard
   - Should see your workouts (or empty state)

4. **Edge function works** ✅
   - Go to Strength page
   - Click "Generate AI Workout"
   - Should show loading spinner
   - Should create workout (or show specific error)

---

## 🐛 Troubleshooting

### Error: "Edge Function returned a non-2xx status code"

**Most likely causes:**
1. ❌ Edge function not deployed → Deploy it (Step 2A)
2. ❌ `LOVABLE_API_KEY` not set → Set it (Step 2B)
3. ❌ Wrong Supabase URL/keys in Vercel → Check Step 1

**How to debug:**
1. Open browser console (F12)
2. Look for error messages
3. Check Supabase function logs (Dashboard → Edge Functions → Logs)

### Error: "Authentication failed"

- User needs to sign in again
- Check Supabase auth is working

### Error: "LOVABLE_API_KEY is not configured"

- The secret is not set in Supabase
- Go to Step 2B and set it

---

## 📝 Quick Reference

### Vercel Environment Variables Needed:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Supabase Secrets Needed:
```
LOVABLE_API_KEY=your-lovable-api-key
```

### Supabase Project Reference:
- From `supabase/config.toml`: `srvekoqxnxljknmrfyis`

---

## 🚀 After Everything is Set Up

1. Test generating a workout
2. Check Supabase function logs if errors occur
3. Check browser console for frontend errors
4. Verify data is being saved to Supabase database

If you need help with any step, let me know!

