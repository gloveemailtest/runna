import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Injury {
  id: string;
  body_part: string;
  severity: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { injuries, type } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    // Get available exercises
    const { data: exercises } = await supabase
      .from("strength_exercises")
      .select("*");

    if (!exercises || exercises.length === 0) {
      throw new Error("No exercises available");
    }

    // Build prompt based on type
    let systemPrompt = `You are an expert running coach and physical therapist specializing in strength training for runners. 
You create personalized strength workout plans that are safe, effective, and properly sequenced.`;

    let userPrompt = "";
    let workoutName = "";
    let isInjuryFocused = false;

    if (injuries && injuries.length > 0) {
      isInjuryFocused = true;
      const injuryList = injuries.map((i: Injury) => 
        `- ${i.body_part} (${i.severity})${i.description ? `: ${i.description}` : ""}`
      ).join("\n");
      
      workoutName = "Injury Recovery Workout";
      userPrompt = `Create a rehabilitation-focused strength workout for a runner with these injuries:
${injuryList}

Focus on exercises that help with recovery and strengthening the affected areas without aggravating them.
Include mobility work and exercises to prevent re-injury.`;
    } else {
      workoutName = "Runner's Strength Session";
      userPrompt = `Create a general strength training workout for a runner.
Focus on:
- Core stability for better running form
- Single-leg exercises for balance and power
- Hip and glute strengthening
- Injury prevention exercises`;
    }

    userPrompt += `

Available exercises (use only these by their exact names):
${exercises.map((e: any) => `- ${e.name}: ${e.description}`).join("\n")}

Create a workout with 5-8 exercises, properly sequenced from activation to main exercises to cool-down.`;

    console.log("Calling AI for strength plan generation...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_strength_workout",
              description: "Create a structured strength training workout",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Workout name" },
                  description: { type: "string", description: "Brief workout description" },
                  duration_minutes: { type: "number", description: "Estimated duration" },
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        exercise_name: { type: "string", description: "Exact name of exercise from list" },
                        sets: { type: "number" },
                        reps: { type: "string", description: "Rep range like '10-12' or '30 seconds'" },
                        notes: { type: "string", description: "Form tips or modifications" }
                      },
                      required: ["exercise_name", "sets", "reps"]
                    }
                  }
                },
                required: ["name", "description", "duration_minutes", "exercises"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_strength_workout" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract workout data from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_strength_workout") {
      throw new Error("Invalid AI response format");
    }

    const workoutData = JSON.parse(toolCall.function.arguments);
    console.log("Parsed workout data:", workoutData);

    // Create strength workout in database
    const { data: newWorkout, error: workoutError } = await supabase
      .from("strength_workouts")
      .insert({
        user_id: user.id,
        name: workoutData.name || workoutName,
        description: workoutData.description,
        duration_minutes: workoutData.duration_minutes,
        is_injury_focused: isInjuryFocused,
        scheduled_date: new Date().toISOString().split("T")[0],
        target_injuries: injuries ? injuries.map((i: Injury) => i.id) : null,
      })
      .select()
      .single();

    if (workoutError) {
      console.error("Error creating workout:", workoutError);
      throw workoutError;
    }

    // Create exercise map for lookup
    const exerciseMap = new Map(
      exercises.map((e: any) => [e.name.toLowerCase(), e.id])
    );

    // Add exercises to workout
    const exerciseInserts = workoutData.exercises
      .map((ex: any, index: number) => {
        const exerciseId = exerciseMap.get(ex.exercise_name.toLowerCase());
        if (!exerciseId) {
          console.warn(`Exercise not found: ${ex.exercise_name}`);
          return null;
        }
        return {
          strength_workout_id: newWorkout.id,
          exercise_id: exerciseId,
          sets: ex.sets || 3,
          reps: ex.reps || "10-12",
          notes: ex.notes || null,
          order_index: index,
        };
      })
      .filter(Boolean);

    if (exerciseInserts.length > 0) {
      const { error: exercisesError } = await supabase
        .from("strength_workout_exercises")
        .insert(exerciseInserts);

      if (exercisesError) {
        console.error("Error adding exercises:", exercisesError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        workoutId: newWorkout.id,
        message: "Strength workout created successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-strength-plan:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
