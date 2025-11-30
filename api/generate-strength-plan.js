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
          { role: "system", content: "You are an elite running strength coach." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return res.status(aiResponse.status).json({
        error: "OpenAI Request Failed",
        details: text
      });
    }

    const aiJson = await aiResponse.json();
    const workout = JSON.parse(aiJson.choices[0].message.content);

    // -------------------------
    // Store workout
    // -------------------------
    const { data: newWorkout, error: workoutError } = await supabase
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

    if (workoutError) {
      return res.status(500).json({ error: workoutError.message });
    }

    // match exercises
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
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: err.message || "Unknown error"
    });
  }
}
