import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import AuthGuard from "@/components/AuthGuard";
import { format, parseISO } from "date-fns";

interface Workout {
  id: string;
  workout_date: string;
  workout_type: string;
  distance: number;
  description: string;
  warmup: string;
  main_workout: string;
  cooldown: string;
  pace_target: string;
  completed_workouts: Array<{
    id: string;
    actual_distance: number;
    actual_duration_minutes: number;
    notes: string;
    rating: number;
  }>;
}

const WorkoutDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  
  // Completion form
  const [actualDistance, setActualDistance] = useState("");
  const [actualDuration, setActualDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(3);

  useEffect(() => {
    loadWorkout();
  }, [id]);

  const loadWorkout = async () => {
    try {
      const { data, error } = await supabase
        .from("workouts")
        .select(`
          *,
          completed_workouts(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      setWorkout(data);
      
      // Pre-fill form if already completed
      if (data.completed_workouts.length > 0) {
        const completion = data.completed_workouts[0];
        setActualDistance(completion.actual_distance?.toString() || "");
        setActualDuration(completion.actual_duration_minutes?.toString() || "");
        setNotes(completion.notes || "");
        setRating(completion.rating || 3);
      }
    } catch (error: any) {
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

      const completionData = {
        workout_id: workout.id,
        user_id: user.id,
        actual_distance: parseFloat(actualDistance) || null,
        actual_duration_minutes: parseInt(actualDuration) || null,
        notes: notes || null,
        rating,
      };

      if (workout.completed_workouts.length > 0) {
        // Update existing completion
        const { error } = await supabase
          .from("completed_workouts")
          .update(completionData)
          .eq("id", workout.completed_workouts[0].id);

        if (error) throw error;
        toast.success("Workout updated!");
      } else {
        // Create new completion
        const { error } = await supabase
          .from("completed_workouts")
          .insert(completionData);

        if (error) throw error;
        toast.success("Workout completed! Great job!");
      }

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error completing workout:", error);
      toast.error("Failed to save workout");
    } finally {
      setCompleting(false);
    }
  };

  if (loading || !workout) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isCompleted = workout.completed_workouts.length > 0;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <Card className="p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-black mb-2">{workout.workout_type}</h1>
                <p className="text-muted-foreground">
                  {format(parseISO(workout.workout_date), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
              {isCompleted && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Completed</span>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Distance</p>
                <p className="text-2xl font-bold">{workout.distance} miles</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Target Pace</p>
                <p className="text-2xl font-bold">{workout.pace_target}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2">Description</h3>
                <p className="text-muted-foreground">{workout.description}</p>
              </div>

              {workout.warmup && (
                <div>
                  <h3 className="font-bold text-lg mb-2">Warm-up</h3>
                  <p className="text-muted-foreground">{workout.warmup}</p>
                </div>
              )}

              {workout.main_workout && (
                <div>
                  <h3 className="font-bold text-lg mb-2">Main Workout</h3>
                  <p className="text-muted-foreground">{workout.main_workout}</p>
                </div>
              )}

              {workout.cooldown && (
                <div>
                  <h3 className="font-bold text-lg mb-2">Cool-down</h3>
                  <p className="text-muted-foreground">{workout.cooldown}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Completion Form */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">
              {isCompleted ? "Update Workout" : "Complete Workout"}
            </h2>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="actualDistance">Actual Distance (miles)</Label>
                  <Input
                    id="actualDistance"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 6.2"
                    value={actualDistance}
                    onChange={(e) => setActualDistance(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actualDuration">Duration (minutes)</Label>
                  <Input
                    id="actualDuration"
                    type="number"
                    placeholder="e.g., 45"
                    value={actualDuration}
                    onChange={(e) => setActualDuration(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="How did the workout feel?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>How did it feel? (1-5)</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-3xl transition-colors ${
                        star <= rating ? "text-yellow-500" : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleComplete}
                disabled={completing}
                size="lg"
                className="w-full"
              >
                {completing
                  ? "Saving..."
                  : isCompleted
                  ? "Update Workout"
                  : "Mark as Complete"}
              </Button>
            </div>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
};

export default WorkoutDetail;
