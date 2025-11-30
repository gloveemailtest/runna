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
    const { injuries, type } = req.body;

    // Pull config from environment
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }
    if (!openaiKey) {
      return res.status(500).json({ error: 'OpenAI API key missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Fetch available exercises
    const { data: exercises } = await supabase
      .from('strength_exercises')
      .select('*')
      .limit(50);
    if (!exercises || exercises.length === 0) {
      return res.status(500).json({ error: 'No exercises available' });
    }

    // Build prompts and select exercises
    let systemPrompt =
      'You are an expert running coach. Create safe, effective strength workouts for runners. Keep responses concise.';
    let userPrompt = '';
    let workoutName = '';
    let isInjuryFocused = false;
    let relevantExercises = exercises;

    if (injuries && injuries.length > 0) {
      isInjuryFocused = true;
      const injuryList = injuries
        .map((i) => `${i.body_part} (${i.severity})`)
        .join(', ');
      workoutName = 'Injury Recovery Workout';
      userPrompt = `Create a rehab workout for injuries: ${injuryList}. Focus on recovery without aggravating injuries.`;

      const injuryBodyParts = injuries.map((i) => i.body_part.toLowerCase());
      relevantExercises = exercises.filter((e) =>
        e.helps_with_injuries?.some((injury) =>
          injuryBodyParts.some((part) =>
            injury.toLowerCase().includes(part)
          )
        )
      );
      // fall back if too few exercises
      if (relevantExercises.length < 5) relevantExercises = exercises;
    } else {
      workoutName = "Runner's Strength Session";
      userPrompt =
        'Create a general runner strength workout focusing on core, single-leg exercises, hips, and glutes.';
    }

    const exerciseList = relevantExercises
      .slice(0, 30)
      .map((e) => e.name)
      .join(', ');
    userPrompt += ` Use 5-8 exercises from this list: ${exerciseList}. Format: exercise name, sets, reps.`;

    // Call OpenAI to generate the plan using function-calling
    const aiResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // you can change to gpt-4-turbo or other available models
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
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
                    name: {
                      type: 'string',
                      description: 'Workout name',
                    },
                    description: {
                      type: 'string',
                      description: 'Brief workout description',
                    },
                    duration_minutes: {
                      type: 'number',
                      description: 'Estimated duration',
                    },
                    exercises: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          exercise_name: {
                            type: 'string',
                            description:
                              'Exact name of exercise from list',
                          },
                          sets: { type: 'number' },
                          reps: {
                            type: 'string',
                            description:
                              'Rep range like "10-12" or "30 seconds"',
                          },
                          notes: {
                            type: 'string',
                            description: 'Form tips or modifications',
                          },
                        },
                        required: ['exercise_name', 'sets', 'reps'],
                      },
                    },
                  },
                  required: ['name', 'description', 'duration_minutes', 'exercises'],
                },
              },
            },
          ],
          tool_choice: {
            type: 'function',
            function: { name: 'create_strength_workout' },
          },
        }),
      }
    );

    // handle errors
    if (!aiResponse.ok) {
      let errorMessage = 'Failed to generate workout';
      if (aiResponse.status === 429)
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      else if (aiResponse.status === 401)
        errorMessage =
          'Authentication failed. Please check your OpenAI API key.';
      else if (aiResponse.status >= 500)
        errorMessage = 'AI service error. Please try again later.';
      else
        errorMessage = `AI service error (${aiResponse.status}). Please try again.`;
      return res
        .status(aiResponse.status)
        .json({ error: errorMessage, success: false });
    }

    const aiData = await aiResponse.json();
    const toolCall =
      aiData.choices?.[0]?.message?.tool_calls?.[0] ?? null;
    if (!toolCall || toolCall.function.name !== 'create_strength_workout') {
      return res.status(500).json({
        error: 'Invalid AI response format',
        success: false,
      });
    }

    let workoutData;
    try {
      workoutData = JSON.parse(toolCall.function.arguments);
    } catch (err) {
      console.error(
        'AI did not return valid JSON:',
        toolCall.function.arguments
      );
      return res.status(500).json({
        error: 'AI returned invalid JSON format',
        success: false,
      });
    }

    // Store workout in database
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
      return res
        .status(500)
        .json({ error: workoutError.message, success: false });
    }

    // Attach exercises to workout
    const exerciseMap = new Map(
      exercises.map((e) => [e.name.toLowerCase(), e.id])
    );
    const exerciseInserts = (workoutData.exercises || [])
      .map((ex, index) => {
        const exerciseId = exerciseMap.get(
          ex.exercise_name.toLowerCase()
        );
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
      await supabase
        .from('strength_workout_exercises')
        .insert(exerciseInserts);
    }

    return res.status(200).json({
      success: true,
      workoutId: newWorkout.id,
      message: 'Strength workout created successfully',
    });
  } catch (error) {
    console.error('Error in generate-strength-plan:', error);
    return res.status(500).json({
      error: error.message || 'Unknown error occurred',
      success: false,
    });
  }
}
