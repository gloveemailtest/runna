import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Plus, Dumbbell, Heart, Clock, ChevronRight, Sparkles, Target, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const MUSCLE_GROUPS = [
  "Core", "Glutes", "Quads", "Hamstrings", "Calves",
  "Hip Flexors", "IT Band", "Lower Back", "Upper Back", "Shoulders"
];

const StrengthPage = () => {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<StrengthWorkout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

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
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out. Please try again.")), 60000); // 60 second timeout
      });

      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please sign in again");
      }

      const functionPromise = fetch("/api/generate-strength-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type: "general" }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to generate workout");
        }
        return { data, error: null };
      });

      const response = await Promise.race([functionPromise, timeoutPromise]) as any;

      // Check for errors in response
      if (response.error) {
        console.error("Supabase function error:", response.error);
        const errorMessage = response.error.message || response.error.error || "Failed to generate workout";
        
        // Provide more helpful error messages
        if (errorMessage.includes("LOVABLE_API_KEY") || errorMessage.includes("not configured")) {
          throw new Error("AI service not configured. Please contact support.");
        }
        if (errorMessage.includes("Authentication failed") || errorMessage.includes("authorization")) {
          throw new Error("Please sign in again to generate workouts.");
        }
        
        throw new Error(errorMessage);
      }

      // Check if response.data has an error
      if (response.data?.error) {
        console.error("Function returned error:", response.data.error);
        throw new Error(response.data.error);
      }

      // Check if response was successful
      if (response.data?.success !== true && !response.data?.workoutId) {
        console.error("Unexpected response format:", response.data);
        throw new Error("Workout generation failed. Please try again.");
      }

      toast.success("Strength workout created!");
      await loadData();
    } catch (error: any) {
      console.error("Error generating workout:", error);
      const errorMessage = error.message || "Failed to generate workout. Please check your connection and try again.";
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const filteredExercises = exercises.filter((exercise) => {
    if (selectedMuscleGroup !== "all" && !exercise.target_muscles.includes(selectedMuscleGroup)) {
      return false;
    }
    if (selectedDifficulty !== "all" && exercise.difficulty !== selectedDifficulty) {
      return false;
    }
    return true;
  });

  const getExercisesByMuscleGroup = () => {
    const grouped: Record<string, Exercise[]> = {};
    MUSCLE_GROUPS.forEach((group) => {
      grouped[group] = exercises.filter((e) => e.target_muscles.includes(group));
    });
    return grouped;
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
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Workout...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Workout
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/injuries")}
        >
          <Heart className="h-4 w-4 mr-2" />
          Injury-Based Plan
        </Button>
      </div>

      <Tabs defaultValue="workouts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workouts">My Workouts</TabsTrigger>
          <TabsTrigger value="exercises">Exercise Library</TabsTrigger>
          <TabsTrigger value="muscle-groups">By Muscle Group</TabsTrigger>
        </TabsList>

        {/* My Workouts Tab */}
        <TabsContent value="workouts" className="space-y-6">
          {workouts.length === 0 ? (
            <Card className="p-8 glass text-center">
              <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-lg font-semibold mb-2">No strength workouts yet</h4>
              <p className="text-muted-foreground mb-4">
                Generate a personalized workout or create one from exercises below
              </p>
            <Button 
              className="bg-gradient-primary" 
              onClick={generateGeneralWorkout}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" /> Create First Workout
                </>
              )}
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
                  
                  <div className="flex items-center gap-3 text-sm mb-3">
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
                    <Badge className="bg-accent/20 text-accent hover:bg-accent/30">
                      Injury Recovery
                    </Badge>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Exercise Library Tab */}
        <TabsContent value="exercises" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Muscle Group</Label>
              <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="All muscle groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Muscle Groups</SelectItem>
                  {MUSCLE_GROUPS.map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label>Difficulty</Label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="All difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredExercises.map((exercise) => (
              <Card key={exercise.id} className="p-4 glass hover:shadow-elevated transition-all">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold flex-1">{exercise.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {exercise.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>
                
                <div className="space-y-2 mb-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Target Muscles:</p>
                    <div className="flex flex-wrap gap-1">
                      {exercise.target_muscles.slice(0, 4).map((muscle) => (
                        <Badge key={muscle} variant="secondary" className="text-xs">
                          {muscle}
                        </Badge>
                      ))}
                      {exercise.target_muscles.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{exercise.target_muscles.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {exercise.helps_with_injuries && exercise.helps_with_injuries.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-accent">
                      <Heart className="h-3 w-3" />
                      <span>Helps: {exercise.helps_with_injuries.slice(0, 2).join(", ")}</span>
                    </div>
                  )}
                  
                  {exercise.equipment && exercise.equipment.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Equipment: {exercise.equipment.join(", ")}</span>
                    </div>
                  )}
                </div>
                
                {exercise.instructions && exercise.instructions.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs font-medium text-primary cursor-pointer">
                      View Instructions
                    </summary>
                    <ol className="text-xs text-muted-foreground mt-2 space-y-1 pl-4">
                      {exercise.instructions.slice(0, 3).map((instruction, i) => (
                        <li key={i} className="list-decimal">{instruction}</li>
                      ))}
                    </ol>
                  </details>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* By Muscle Group Tab */}
        <TabsContent value="muscle-groups" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {Object.entries(getExercisesByMuscleGroup()).map(([group, groupExercises]) => (
              <Card key={group} className="p-4 glass">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">{group}</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {groupExercises.length} exercises
                  </Badge>
                </div>
                <div className="space-y-2">
                  {groupExercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No exercises available</p>
                  ) : (
                    groupExercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{exercise.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {exercise.description}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs ml-2">
                            {exercise.difficulty}
                          </Badge>
                        </div>
                        {exercise.helps_with_injuries && exercise.helps_with_injuries.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-accent">
                            <Heart className="h-3 w-3" />
                            <span>{exercise.helps_with_injuries.join(", ")}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default StrengthPage;
