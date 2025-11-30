import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return res.status(500).json({ error: 'LOVABLE_API_KEY is not configured' });
    }

    const { injuries, type } = req.body;
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Get available exercises
    const { data: exercises } = await supabase
      .from('strength_exercises')
      .select('*')
      .limit(50);

    if (!exercises || exercises.length === 0) {
      return res.status(500).json({ error: 'No exercises available' });
    }

    // Build prompt
    let systemPrompt = `You are an expert running coach. Create safe, effective strength workouts for runners. Keep responses concise.`;

    let userPrompt = '';
    let workoutName = '';
    let isInjuryFocused = false;
    let relevantExercises = exercises;

    if (injuries && injuries.length > 0) {
      isInjuryFocused = true;
      const injuryList = injuries.map((i) => 
        `${i.body_part} (${i.severity})`
      ).join(', ');
      
      workoutName = 'Injury Recovery Workout';
      userPrompt = `Create a rehab workout for injuries: ${injuryList}. Focus on recovery without aggravating injuries.`;
      
      const injuryBodyParts = injuries.map((i) => i.body_part.toLowerCase());
      relevantExercises = exercises.filter((e) => 
        e.helps_with_injuries?.some((injury) => 
          injuryBodyParts.some(part => injury.toLowerCase().includes(part))
        )
      );
      if (relevantExercises.length < 5) {
        relevantExercises = exercises;
      }
    } else {
      workoutName = "Runner's Strength Session";
      userPrompt = `Create a general runner strength workout focusing on core, single-leg exercises, hips, and glutes.`;
    }

    const exerciseList = relevantExercises.slice(0, 30).map((e) => e.name).join(', ');
    userPrompt += ` Use 5-8 exercises from this list: ${exerciseList}. Format: exercise name, sets, reps.`;

    // Call AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_strength_workout',
              description: 'Create a structured strength training workout',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Workout name' },
                  description: { type: 'string', description: 'Brief workout description' },
                  duration_minutes: { type: 'number', description: 'Estimated duration' },
                  exercises: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        exercise_name: { type: 'string', description: 'Exact name of exercise from list' },
                        sets: { type: 'number' },
                        reps: { type: 'string', description: 'Rep range like "10-12" or "30 seconds"' },
                        notes: { type: 'string', description: 'Form tips or modifications' }
                      },
                      required: ['exercise_name', 'sets', 'reps']
                    }
                  }
                },
                required: ['name', 'description', 'duration_minutes', 'exercises']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_strength_workout' } }
      }),
    });

    if (!aiResponse.ok) {
      let errorMessage = 'Failed to generate workout';
      if (aiResponse.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      } else if (aiResponse.status === 402) {
        errorMessage = 'AI credits exhausted. Please add credits to continue.';
      } else if (aiResponse.status === 401) {
        errorMessage = 'Authentication failed. Please sign in again.';
      } else if (aiResponse.status >= 500) {
        errorMessage = 'Server error. Please try again in a moment.';
      } else {
        errorMessage = `AI service error (${aiResponse.status}). Please try again.`;
      }
      
      return res.status(aiResponse.status).json({ error: errorMessage, success: false });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'create_strength_workout') {
      return res.status(500).json({ error: 'Invalid AI response format', success: false });
    }

    const workoutData = JSON.parse(toolCall.function.arguments);

    // Create workout in database
    const { data: newWorkout, error: workoutError } = await supabase
      .from('strength_workouts')
      .insert({
        user_id: user.id,
        name: workoutData.name || workoutName,
        description: workoutData.description,
        duration_minutes: workoutData.duration_minutes,
        is_injury_focused: isInjuryFocused,
        scheduled_date: new Date().toISOString().split('T')[0],
        target_injuries: injuries ? injuries.map((i) => i.id) : null,
      })
      .select()
      .single();

    if (workoutError) {
      return res.status(500).json({ error: workoutError.message, success: false });
    }

    // Add exercises
    const exerciseMap = new Map(exercises.map((e) => [e.name.toLowerCase(), e.id]));
    const exerciseInserts = workoutData.exercises
      .map((ex, index) => {
        const exerciseId = exerciseMap.get(ex.exercise_name.toLowerCase());
        if (!exerciseId) return null;
        return {
          strength_workout_id: newWorkout.id,
          exercise_id: exerciseId,
          sets: ex.sets || 3,
          reps: ex.reps || '10-12',
          notes: ex.notes || null,
          order_index: index,
        };
      })
      .filter(Boolean);

    if (exerciseInserts.length > 0) {
      await supabase.from('strength_workout_exercises').insert(exerciseInserts);
    }

    return res.status(200).json({ 
      success: true, 
      workoutId: newWorkout.id,
      message: 'Strength workout created successfully' 
    });
  } catch (error) {
    console.error('Error in generate-strength-plan:', error);
    return res.status(500).json({ 
      error: error.message || 'Unknown error occurred',
      success: false 
    });
  }
}

