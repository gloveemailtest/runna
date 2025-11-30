import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { injuries, type } = req.body;

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Missing Supabase keys." });
    }
    if (!openaiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // -------------------------
    // REAL AUTH FIX: get token
    // -------------------------
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    // FIX: header must be a VALID Supabase session token
    const token = authHeader.replace("Bearer ", "").trim();

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ error: "Invalid Supabase session token" });
    }

    const user = userData.user;

    // -------------------------
    // Fetch exercises
    // -------------------------
    const { data: exercises } = await supabase
      .from("strength_exercises")
      .select("*")
      .limit(50);

    if (!exercises || exercises.length === 0) {
      return res.status(500).json({ error: "No exercises in database" });
    }

    // -------------------------
    // Build prompt
    // -------------------------
    const exerciseList = exercises.map((e) => e.name).join(", ");

    const prompt = `
      Create a JSON strength workout for a runner.
      Format EXACTLY as:

      {
        "name": "",
        "description": "",
        "duration_minutes": 0,
        "exercises": [
          {
            "exercise_name": "",
            "sets": 3,
            "reps": "10-12",
            "notes": ""
          }
        ]
      }

      Exercises allowed: ${exerciseList}
      Injuries: ${JSON.stringify(injuries || [])}
    `;

    // -------------------------
    // Call OpenAI safely
    // -------------------------
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content
