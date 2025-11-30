import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Clock, Dumbbell, CheckCircle, Star, Heart } from "lucide-react";
import { format } from "date-fns";

interface Exercise {
  id: string;
  name: string;
  description: string;
  target_muscles: string[];
  instructions: string[];
  equipment: string[];
}

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  sets: number;
  reps: string;
  weight: string;
  notes: string;
  order_index: number;
  exercise: Exercise;
}

interface StrengthWorkout {
  id: string;
  name: string;
  description: string;
  scheduled_date: string;
  duration_minutes: number;
  is_injury_focused: boolean;
}

const StrengthDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<StrengthWorkout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  
  // Completion form
  const [rating, setRating] = useState(4);
  const [painLevel, setPainLevel] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadWorkout();
  }, [id]);

  const loadWorkout = async () => {
    if (!id) return;
    
    try {
      const [workoutRes, exercisesRes] = await Promise.all([
        supabase
          .from("strength_workouts")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("strength_workout_exercises")
          .select(`
            *,
            exercise:strength_exercises(*)
          `)
          .eq("strength_workout_id", id)
          .order("order_index"),
      ]);

      if (workoutRes.error) throw workoutRes.error;
      if (exercisesRes.error) throw exercisesRes.error;

      setWorkout(workoutRes.data);
      setExercises(exercisesRes.data || []);
    } catch (error) {
      console.error("Error loading workout:", error);
      toast.error("Failed to load workout");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!workout) return;
    
    setCompleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("completed_strength_workouts").insert({
        strength_workout_id: workout.id,
        user_id: user.id,
        rating,
        pain_level: painLevel,
        notes,
        duration_minutes: workout.duration_minutes,
      });

      if (error) throw error;

      toast.success("Workout completed! Great job! 💪");
      navigate("/strength");
    } catch (error) {
      console.error("Error completing workout:", error);
      toast.error("Failed to save completion");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!workout) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p>Workout not found</p>
          <Button onClick={() => navigate("/strength")} className="mt-4">
            Back to Strength
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate("/strength")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Strength
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
            workout.is_injury_focused ? "bg-gradient-accent" : "bg-gradient-secondary"
          }`}>
            {workout.is_injury_focused ? (
              <Heart className="h-6 w-6 text-white" />
            ) : (
              <Dumbbell className="h-6 w-6 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{workout.name}</h1>
            {workout.scheduled_date && (
              <p className="text-muted-foreground">
                {format(new Date(workout.scheduled_date), "EEEE, MMMM d")}
              </p>
            )}
          </div>
        </div>
        
        <p className="text-muted-foreground mb-4">{workout.description}</p>
        
        <div className="flex gap-4">
          {workout.duration_minutes && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" /> {workout.duration_minutes} min
            </Badge>
          )}
          {workout.is_injury_focused && (
            <Badge className="bg-accent/20 text-accent">
              <Heart className="h-3 w-3 mr-1" /> Injury Recovery
            </Badge>
          )}
        </div>
      </div>

      {/* Exercises */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Exercises ({exercises.length})</h3>
        
        <div className="space-y-4">
          {exercises.map((item, index) => (
            <Card key={item.id} className="p-4 glass">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{item.exercise?.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.exercise?.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline">{item.sets} sets</Badge>
                    <Badge variant="outline">{item.reps} reps</Badge>
                    {item.weight && <Badge variant="outline">{item.weight}</Badge>}
                  </div>
                  
                  {item.exercise?.instructions && item.exercise.instructions.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium mb-2">Instructions:</p>
                      <ol className="text-sm text-muted-foreground space-y-1">
                        {item.exercise.instructions.map((instruction, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary font-medium">{i + 1}.</span>
                            {instruction}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Completion Form */}
      <Card className="p-6 glass border-primary/20">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          Complete Workout
        </h3>
        
        <div className="space-y-6">
          {/* Rating */}
          <div>
            <label className="text-sm font-medium mb-3 block">How was this workout?</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating ? "fill-warning text-warning" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Pain Level */}
          {workout.is_injury_focused && (
            <div>
              <label className="text-sm font-medium mb-3 block">
                Pain Level: {painLevel}/10
              </label>
              <Slider
                value={[painLevel]}
                onValueChange={([value]) => setPainLevel(value)}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>No pain</span>
                <span>Severe</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Any modifications?"
              rows={3}
            />
          </div>

          <Button
            onClick={handleComplete}
            disabled={completing}
            className="w-full bg-gradient-success"
          >
            {completing ? "Saving..." : "Complete Workout"}
          </Button>
        </div>
      </Card>
    </AppLayout>
  );
};

export default StrengthDetail;
