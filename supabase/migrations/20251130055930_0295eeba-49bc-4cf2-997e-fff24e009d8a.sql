-- Create enum for injury severity
CREATE TYPE public.injury_severity AS ENUM ('mild', 'moderate', 'severe');

-- Create enum for body parts
CREATE TYPE public.body_part AS ENUM (
  'neck', 'shoulder', 'upper_back', 'lower_back', 'chest',
  'bicep', 'tricep', 'forearm', 'wrist', 'hand',
  'hip', 'glute', 'quad', 'hamstring', 'knee',
  'calf', 'shin', 'ankle', 'foot', 'it_band', 'groin'
);

-- Create strength exercises catalog
CREATE TABLE public.strength_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_muscles TEXT[] NOT NULL,
  helps_with_injuries body_part[],
  difficulty TEXT DEFAULT 'beginner',
  equipment TEXT[],
  video_url TEXT,
  instructions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user injuries table
CREATE TABLE public.user_injuries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body_part body_part NOT NULL,
  severity injury_severity NOT NULL DEFAULT 'mild',
  description TEXT,
  injury_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create strength workouts table
CREATE TABLE public.strength_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE,
  duration_minutes INTEGER,
  is_injury_focused BOOLEAN DEFAULT false,
  target_injuries UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create strength workout exercises junction table
CREATE TABLE public.strength_workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  strength_workout_id UUID NOT NULL REFERENCES public.strength_workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.strength_exercises(id) ON DELETE CASCADE,
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '10-12',
  weight TEXT,
  notes TEXT,
  order_index INTEGER DEFAULT 0
);

-- Create completed strength workouts table
CREATE TABLE public.completed_strength_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  strength_workout_id UUID NOT NULL REFERENCES public.strength_workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration_minutes INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10)
);

-- Create workout_pain_log for tracking pain during runs
CREATE TABLE public.workout_pain_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body_part body_part NOT NULL,
  pain_level INTEGER CHECK (pain_level >= 1 AND pain_level <= 10),
  description TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add training preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS training_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS injury_history TEXT[];

-- Enable RLS on all tables
ALTER TABLE public.strength_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strength_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strength_workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_strength_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_pain_log ENABLE ROW LEVEL SECURITY;

-- Strength exercises are public read
CREATE POLICY "Anyone can view strength exercises" ON public.strength_exercises
FOR SELECT USING (true);

-- User injuries policies
CREATE POLICY "Users can view own injuries" ON public.user_injuries
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own injuries" ON public.user_injuries
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own injuries" ON public.user_injuries
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own injuries" ON public.user_injuries
FOR DELETE USING (auth.uid() = user_id);

-- Strength workouts policies
CREATE POLICY "Users can view own strength workouts" ON public.strength_workouts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strength workouts" ON public.strength_workouts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strength workouts" ON public.strength_workouts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strength workouts" ON public.strength_workouts
FOR DELETE USING (auth.uid() = user_id);

-- Strength workout exercises policies (through workout ownership)
CREATE POLICY "Users can view own workout exercises" ON public.strength_workout_exercises
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.strength_workouts WHERE id = strength_workout_id AND user_id = auth.uid())
);

CREATE POLICY "Users can insert own workout exercises" ON public.strength_workout_exercises
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.strength_workouts WHERE id = strength_workout_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update own workout exercises" ON public.strength_workout_exercises
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.strength_workouts WHERE id = strength_workout_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete own workout exercises" ON public.strength_workout_exercises
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.strength_workouts WHERE id = strength_workout_id AND user_id = auth.uid())
);

-- Completed strength workouts policies
CREATE POLICY "Users can view own completed strength workouts" ON public.completed_strength_workouts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completed strength workouts" ON public.completed_strength_workouts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completed strength workouts" ON public.completed_strength_workouts
FOR UPDATE USING (auth.uid() = user_id);

-- Workout pain log policies
CREATE POLICY "Users can view own pain logs" ON public.workout_pain_log
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pain logs" ON public.workout_pain_log
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pain logs" ON public.workout_pain_log
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pain logs" ON public.workout_pain_log
FOR DELETE USING (auth.uid() = user_id);

-- Insert starter strength exercises
INSERT INTO public.strength_exercises (name, description, target_muscles, helps_with_injuries, difficulty, equipment, instructions) VALUES
('Single Leg Deadlift', 'Unilateral hip hinge for hamstring and glute strength', ARRAY['hamstrings', 'glutes', 'core'], ARRAY['hamstring', 'lower_back', 'knee']::body_part[], 'intermediate', ARRAY['dumbbells', 'kettlebell'], ARRAY['Stand on one leg', 'Hinge at hips keeping back flat', 'Lower weight toward ground', 'Return to standing']),
('Clamshells', 'Hip abductor strengthening for IT band and hip stability', ARRAY['hip abductors', 'glutes'], ARRAY['it_band', 'hip', 'knee']::body_part[], 'beginner', ARRAY['resistance band'], ARRAY['Lie on side with knees bent', 'Keep feet together', 'Open top knee like a clamshell', 'Lower slowly']),
('Eccentric Heel Drops', 'Calf strengthening for Achilles and calf issues', ARRAY['calves', 'achilles'], ARRAY['calf', 'ankle', 'shin']::body_part[], 'beginner', ARRAY['step', 'stairs'], ARRAY['Stand on edge of step on balls of feet', 'Rise up on both feet', 'Lower slowly on one foot', 'Drop heel below step level']),
('Monster Walks', 'Lateral band walks for hip and knee stability', ARRAY['hip abductors', 'glutes'], ARRAY['knee', 'it_band', 'hip']::body_part[], 'beginner', ARRAY['resistance band'], ARRAY['Place band around ankles', 'Quarter squat position', 'Step sideways maintaining tension', 'Keep toes forward']),
('Plank', 'Core stability for running posture', ARRAY['core', 'shoulders'], ARRAY['lower_back', 'hip']::body_part[], 'beginner', ARRAY['none'], ARRAY['Forearms on ground, elbows under shoulders', 'Body in straight line', 'Engage core, squeeze glutes', 'Hold position']),
('Bird Dog', 'Core and back stability exercise', ARRAY['core', 'lower back', 'glutes'], ARRAY['lower_back', 'hip']::body_part[], 'beginner', ARRAY['none'], ARRAY['Start on hands and knees', 'Extend opposite arm and leg', 'Keep back flat', 'Return and switch sides']),
('Bulgarian Split Squat', 'Single leg strength for quad and glute power', ARRAY['quads', 'glutes', 'hamstrings'], ARRAY['knee', 'hip', 'quad']::body_part[], 'intermediate', ARRAY['dumbbells', 'bench'], ARRAY['Rear foot elevated on bench', 'Lower until back knee near ground', 'Drive through front heel', 'Keep torso upright']),
('Copenhagen Plank', 'Adductor strengthening for groin issues', ARRAY['adductors', 'core'], ARRAY['groin', 'hip']::body_part[], 'advanced', ARRAY['bench'], ARRAY['Side plank position', 'Top leg on bench', 'Lift bottom leg to meet top', 'Hold position']),
('Foam Roll IT Band', 'Self-myofascial release for IT band', ARRAY['it band'], ARRAY['it_band', 'knee', 'hip']::body_part[], 'beginner', ARRAY['foam roller'], ARRAY['Lie on side with roller under outer thigh', 'Roll from hip to knee slowly', 'Pause on tender spots', 'Roll for 1-2 minutes']),
('Calf Raises', 'Basic calf strengthening', ARRAY['calves'], ARRAY['calf', 'ankle', 'shin']::body_part[], 'beginner', ARRAY['none', 'dumbbells'], ARRAY['Stand with feet hip-width apart', 'Rise onto balls of feet', 'Lower slowly with control', 'Can add weight for progression']),
('Glute Bridge', 'Hip extension for glute activation', ARRAY['glutes', 'hamstrings'], ARRAY['lower_back', 'hip', 'hamstring']::body_part[], 'beginner', ARRAY['none'], ARRAY['Lie on back, knees bent', 'Drive hips up squeezing glutes', 'Hold at top briefly', 'Lower with control']),
('Side Plank', 'Lateral core stability', ARRAY['obliques', 'core', 'hip'], ARRAY['lower_back', 'hip', 'it_band']::body_part[], 'beginner', ARRAY['none'], ARRAY['Lie on side, elbow under shoulder', 'Lift hips off ground', 'Body in straight line', 'Hold position']);