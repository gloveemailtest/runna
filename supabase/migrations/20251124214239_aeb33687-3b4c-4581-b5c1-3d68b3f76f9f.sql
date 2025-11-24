-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  current_weekly_mileage INTEGER,
  longest_recent_run DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create training plans table
CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  race_date DATE NOT NULL,
  goal_time_minutes INTEGER NOT NULL,
  training_days_per_week INTEGER NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training plans"
  ON public.training_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training plans"
  ON public.training_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training plans"
  ON public.training_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own training plans"
  ON public.training_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Create workouts table
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id UUID REFERENCES public.training_plans(id) ON DELETE CASCADE NOT NULL,
  workout_date DATE NOT NULL,
  workout_type TEXT NOT NULL,
  distance DECIMAL,
  duration_minutes INTEGER,
  description TEXT,
  warmup TEXT,
  main_workout TEXT,
  cooldown TEXT,
  pace_target TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workouts"
  ON public.workouts FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.training_plans WHERE id = workouts.training_plan_id
  ));

-- Create completed workouts table for progress tracking
CREATE TABLE public.completed_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  actual_distance DECIMAL,
  actual_duration_minutes INTEGER,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);

ALTER TABLE public.completed_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completed workouts"
  ON public.completed_workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completed workouts"
  ON public.completed_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completed workouts"
  ON public.completed_workouts FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_plans_updated_at
  BEFORE UPDATE ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();