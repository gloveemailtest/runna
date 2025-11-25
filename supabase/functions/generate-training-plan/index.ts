import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      weeklyMileage, 
      longestRun, 
      raceDate, 
      goalTimeMinutes, 
      trainingDaysPerWeek 
    } = await req.json();

    console.log("Generating training plan with:", { 
      weeklyMileage, 
      longestRun, 
      raceDate, 
      goalTimeMinutes, 
      trainingDaysPerWeek 
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate weeks until race
    const today = new Date();
    const race = new Date(raceDate);
    const weeksUntilRace = Math.floor((race.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000));

    const systemPrompt = `You are an expert marathon training coach. Create a personalized training plan based on the runner's current fitness and goals. The plan should follow these principles:

1. Progressive overload: Gradually increase mileage
2. Include easy runs, tempo runs, intervals, and long runs
3. Follow the 10% rule for weekly mileage increases
4. Include recovery weeks every 3-4 weeks
5. Taper in the final 2-3 weeks before race day

Format your response as a JSON array of weekly plans. Each week should have:
- weekNumber: number
- weekStartDate: ISO date string
- totalMileage: number
- workouts: array of daily workouts

Each workout should include:
- dayOfWeek: string (e.g., "Monday")
- date: ISO date string
- workoutType: "Easy Run" | "Tempo Run" | "Intervals" | "Long Run" | "Rest" | "Cross Training"
- distance: number (miles, can be 0 for rest days)
- description: detailed workout description
- warmup: warmup instructions
- mainWorkout: main workout details
- cooldown: cooldown instructions
- paceTarget: pace guidance (e.g., "8:30-9:00 min/mile")`;

    const userPrompt = `Create a ${weeksUntilRace}-week marathon training plan for a runner with:
- Current weekly mileage: ${weeklyMileage} miles
- Longest recent run: ${longestRun} miles
- Goal marathon time: ${Math.floor(goalTimeMinutes / 60)}:${(goalTimeMinutes % 60).toString().padStart(2, '0')}
- Training days per week: ${trainingDaysPerWeek}
- Race date: ${raceDate}

Generate a complete week-by-week plan starting from today (${today.toISOString().split('T')[0]}).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const planText = data.choices[0].message.content;
    
    console.log("AI response received, parsing plan...");
    
    // Extract JSON from the response (AI might wrap it in markdown code blocks)
    let planData;
    try {
      const jsonMatch = planText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        planData = JSON.parse(jsonMatch[0]);
      } else {
        planData = JSON.parse(planText);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse training plan from AI response");
    }

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    console.log("Creating training plan for user:", user.id);

    // Save the training plan to database
    const { data: savedPlan, error: planError } = await supabase
      .from("training_plans")
      .insert({
        user_id: user.id,
        race_date: raceDate,
        goal_time_minutes: goalTimeMinutes,
        training_days_per_week: trainingDaysPerWeek,
        plan_data: planData,
      })
      .select()
      .single();

    if (planError) {
      console.error("Error saving plan:", planError);
      throw planError;
    }

    console.log("Training plan saved:", savedPlan.id);

    // Save individual workouts
    const workouts = planData.flatMap((week: any) => 
      week.workouts.map((workout: any) => ({
        training_plan_id: savedPlan.id,
        workout_date: workout.date,
        workout_type: workout.workoutType,
        distance: workout.distance,
        description: workout.description,
        warmup: workout.warmup,
        main_workout: workout.mainWorkout,
        cooldown: workout.cooldown,
        pace_target: workout.paceTarget,
      }))
    );

    const { error: workoutsError } = await supabase
      .from("workouts")
      .insert(workouts);

    if (workoutsError) {
      console.error("Error saving workouts:", workoutsError);
      throw workoutsError;
    }

    console.log(`Saved ${workouts.length} workouts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        planId: savedPlan.id,
        plan: planData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-training-plan:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
