import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { injuries, type } = req.body;

    // ---- ENVIRONMENT ----
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Missing Supabase environment variables" });
    }
    if (!openaiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // ---- SUPABASE CLIENT ----
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ---- AUTHENTICATE USER ----
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Authentication failed" });
    }

    // ---- FETCH EXERCISES ----
    const { data: exercises } = await supabase
      .from("strength_exercises")
      .select("*")
      .limit(50);

    if (!exercises || exercises.length === 0) {
      return res.status(500).json({ error: "No exercises in database" });
    }

    // ---- BUILD PROMPT ----
    const exerciseList = exercises.map((e) => e.name).join(", ");

    const basePrompt = `
      Create a JSON strength workout for a runner.
      If injuries exist, make the workout safe for recovery.
      Use ONLY exercises from this list: ${exerciseList}.
      Return VALID JSON ONLY in this exact format:

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
    `;

    const injuryPrompt =
      injuries && injuries.length > 0
        ? `Runner injuries: ${JSON.stringify(injuries)}`
        : "No injuries.";

    // ---- CALL OPENAI ----
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are an elite running strength coach." },
          { role: "user", content: basePrompt },
          { role: "user", content: injuryPrompt }
        ]
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return res.status(openaiResponse.status).json({
        error: "OpenAI Error",
        details: errorText
      });
    }

    const aiData = await openaiResponse.json();
    const workout = JSON.parse(aiData.choices[0].message.content);

    // ---- SAVE WORKOUT ----
    const { data: newWorkout, error: workoutInsertError } = await supabase
      .from("strength_workouts")
      .insert({
        user_id: user.id,
        name: workout.name,
        description: workout.description,
        duration_minutes: workout.duration_minutes,
        is_injury_focused: injuries?.length > 0,
        scheduled_date: new Date().toISOString().split("T")[0]
      })
      .select()
      .single();

    if (workoutInsertError) {
      return res.status(500).json({ error: workoutInsertError.message });
    }

    const exerciseMap = new Map(exercises.map((e) => [e.name.toLowerCase(), e.id]));

    const inserts = workout.exercises
      .map((ex, idx) => {
        const id = exerciseMap.get(ex.exercise_name.toLowerCase());
        if (!id) return null;

        return {
          strength_workout_id: newWorkout.id,
          exercise_id: id,
          sets: ex.sets,
          reps: ex.reps,
          notes: ex.notes,
          order_index: idx
        };
      })
      .filter(Boolean);

    if (inserts.length > 0) {
      await supabase.from("strength_workout_exercises").insert(inserts);
    }

    return res.status(200).json({
      success: true,
      workoutId: newWorkout.id,
      workout
    });
  } catch (err) {
    console.error("Strength API Error:", err);
    return res.status(500).json({
      error: err.message || "Unknown server error"
    });
  }
}

