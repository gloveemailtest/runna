# Supabase Edge Function Setup

## Required Environment Variables

Your edge functions need the following environment variable set in Supabase:

### `LOVABLE_API_KEY`

This is required for the AI workout generation to work.

## How to Set Environment Variables in Supabase

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Click **Add Secret**
5. Add:
   - **Name**: `LOVABLE_API_KEY`
   - **Value**: Your Lovable API key (get it from your Lovable account)
6. Click **Save**

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Set the secret
supabase secrets set LOVABLE_API_KEY=your_key_here
```

## Deploy Edge Functions

After setting the environment variable, deploy your edge functions:

```bash
# Deploy all functions
supabase functions deploy

# Or deploy a specific function
supabase functions deploy generate-strength-plan
```

## Verify Setup

1. Check that your edge functions are deployed in the Supabase dashboard
2. Check the function logs to see if there are any errors
3. Try generating a workout in your app

## Troubleshooting

If you still get errors:
1. Check the Supabase function logs in the dashboard
2. Verify the LOVABLE_API_KEY is set correctly
3. Make sure the function is deployed
4. Check that your Supabase project has the correct URL and keys configured

