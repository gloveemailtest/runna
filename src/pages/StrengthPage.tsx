import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Plus, Dumbbell, Heart, Clock, ChevronRight, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface StrengthWorkout {
  id: string;
  name: string;
  description: string;
  scheduled_date: string;
  duration_minutes: number;
  is_injury_focused: boolean;
  created_at: string;
}

interface Exercise {
  id: string;
  name: string;
  description: string;
  target_muscles: string[];
  helps_with_injuries: string[];
  difficulty: string;
  equipment: string[];
  instructions: string[];
}

const StrengthPage = () => {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<StrengthWorkout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [workoutsRes, exercisesRes] = await Promise.all([
        supabase
          .from("strength_workouts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("strength_exercises").select("*"),
      ]);

      if (workoutsRes.error) throw workoutsRes.error;
      if (exercisesRes.error) throw exercisesRes.error;

      setWorkouts(workoutsRes.data || []);
      setExercises(exercisesRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load strength data");
    } finally {
      setLoading(false);
    }
  };

  const generateGeneralWorkout = async () => {
    setGenerating(true);
    try {
      const response = await supabase.functions.invoke("generate-strength-plan", {
        body: { type: "general" },
      });

      if (response.error) throw response.error;

      toast.success("Strength workout created!");
      loadData();
    } catch (error: any) {
      console.error("Error generating workout:", error);
      toast.error(error.message || "Failed to generate workout");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Strength Training">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Strength Training">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Button
          className="bg-gradient-secondary"
          onClick={generateGeneralWorkout}
          disabled={generating}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {generating ? "Generating..." : "Generate Workout"}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/injuries")}
        >
          <Heart className="h-4 w-4 mr-2" />
          Injury-Based Plan
        </Button>
      </div>

      {/* My Workouts */}
      <section className="mb-10">
        <h3 className="text-xl font-bold mb-4">My Workouts</h3>
        
        {workouts.length === 0 ? (
          <Card className="p-8 glass text-center">
            <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">No strength workouts yet</h4>
            <p className="text-muted-foreground mb-4">
              Generate a personalized workout or create one from exercises below
            </p>
            <Button className="bg-gradient-primary" onClick={generateGeneralWorkout}>
              <Plus className="h-4 w-4 mr-2" /> Create First Workout
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workouts.map((workout) => (
              <Card
                key={workout.id}
                className="p-4 glass hover:shadow-elevated transition-all cursor-pointer group"
                onClick={() => navigate(`/strength/${workout.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    workout.is_injury_focused ? "bg-gradient-accent" : "bg-gradient-secondary"
                  }`}>
                    {workout.is_injury_focused ? (
                      <Heart className="h-6 w-6 text-white" />
                    ) : (
                      <Dumbbell className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                
                <h4 className="font-semibold mb-1">{workout.name}</h4>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {workout.description}
                </p>
                
                <div className="flex items-center gap-3 text-sm">
                  {workout.duration_minutes && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" /> {workout.duration_minutes} min
                    </span>
                  )}
                  {workout.scheduled_date && (
                    <span className="text-muted-foreground">
                      {format(new Date(workout.scheduled_date), "MMM d")}
                    </span>
                  )}
                </div>
                
                {workout.is_injury_focused && (
                  <Badge className="mt-3 bg-accent/20 text-accent hover:bg-accent/30">
                    Injury Recovery
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Exercise Library */}
      <section>
        <h3 className="text-xl font-bold mb-4">Exercise Library</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exercises.map((exercise) => (
            <Card key={exercise.id} className="p-4 glass">
              <h4 className="font-semibold mb-2">{exercise.name}</h4>
              <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {exercise.target_muscles.slice(0, 3).map((muscle) => (
                  <Badge key={muscle} variant="secondary" className="text-xs">
                    {muscle}
                  </Badge>
                ))}
              </div>
              
              {exercise.helps_with_injuries && exercise.helps_with_injuries.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-accent">
                  <Heart className="h-3 w-3" />
                  Helps: {exercise.helps_with_injuries.slice(0, 2).join(", ")}
                </div>
              )}
              
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {exercise.difficulty}
                </Badge>
                {exercise.equipment && exercise.equipment.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {exercise.equipment[0]}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </AppLayout>
  );
};

export default StrengthPage;
