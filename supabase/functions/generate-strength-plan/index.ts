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

    // Get available exercises - limit to most relevant ones for faster processing
    const { data: exercises } = await supabase
      .from("strength_exercises")
      .select("*")
      .limit(50); // Limit to 50 exercises for faster AI processing

    if (!exercises || exercises.length === 0) {
      throw new Error("No exercises available");
    }

    // Build prompt based on type - optimized for speed
    let systemPrompt = `You are an expert running coach. Create safe, effective strength workouts for runners. Keep responses concise.`;

    let userPrompt = "";
    let workoutName = "";
    let isInjuryFocused = false;
    let relevantExercises = exercises;

    if (injuries && injuries.length > 0) {
      isInjuryFocused = true;
      const injuryList = injuries.map((i: Injury) => 
        `${i.body_part} (${i.severity})`
      ).join(", ");
      
      workoutName = "Injury Recovery Workout";
      userPrompt = `Create a rehab workout for injuries: ${injuryList}. Focus on recovery without aggravating injuries.`;
      
      // Filter exercises that help with these injuries
      const injuryBodyParts = injuries.map((i: Injury) => i.body_part.toLowerCase());
      relevantExercises = exercises.filter((e: any) => 
        e.helps_with_injuries?.some((injury: string) => 
          injuryBodyParts.some(part => injury.toLowerCase().includes(part))
        )
      );
      // If no specific matches, use all exercises
      if (relevantExercises.length < 5) {
        relevantExercises = exercises;
      }
    } else {
      workoutName = "Runner's Strength Session";
      userPrompt = `Create a general runner strength workout focusing on core, single-leg exercises, hips, and glutes.`;
    }

    // Limit exercise list to top 30 for faster processing
    const exerciseList = relevantExercises.slice(0, 30).map((e: any) => e.name).join(", ");

    userPrompt += ` Use 5-8 exercises from this list: ${exerciseList}. Format: exercise name, sets, reps.`;

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
        temperature: 0.7, // Lower temperature for faster, more consistent responses
        max_tokens: 1000, // Limit tokens for faster response
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
      
      let errorMessage = "Failed to generate workout";
      if (aiResponse.status === 429) {
        errorMessage = "Rate limit exceeded. Please try again in a moment.";
      } else if (aiResponse.status === 402) {
        errorMessage = "AI credits exhausted. Please add credits to continue.";
      } else if (aiResponse.status === 401) {
        errorMessage = "Authentication failed. Please sign in again.";
      } else if (aiResponse.status >= 500) {
        errorMessage = "Server error. Please try again in a moment.";
      } else {
        errorMessage = `AI service error (${aiResponse.status}). Please try again.`;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage, success: false }),
        { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Create exercise map for lookup (use all exercises, not just filtered)
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
