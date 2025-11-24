import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, LogOut, Trophy, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import AuthGuard from "@/components/AuthGuard";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";

interface Workout {
  id: string;
  workout_date: string;
  workout_type: string;
  distance: number;
  description: string;
  pace_target: string;
  completed_workouts: { id: string }[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    loadWorkouts();
  }, [weekStart]);

  const loadWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the user's training plan
      const { data: plans } = await supabase
        .from("training_plans")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!plans || plans.length === 0) {
        navigate("/onboarding");
        return;
      }

      // Get workouts for the current week
      const weekEnd = addDays(weekStart, 7);
      
      const { data: workoutsData, error } = await supabase
        .from("workouts")
        .select(`
          *,
          completed_workouts(id)
        `)
        .eq("training_plan_id", plans[0].id)
        .gte("workout_date", format(weekStart, "yyyy-MM-dd"))
        .lt("workout_date", format(weekEnd, "yyyy-MM-dd"))
        .order("workout_date");

      if (error) throw error;
      
      setWorkouts(workoutsData || []);
    } catch (error: any) {
      console.error("Error loading workouts:", error);
      toast.error("Failed to load workouts");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      navigate("/");
    }
  };

  const handlePreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const getWorkoutForDay = (date: Date) => {
    return workouts.find((w) => isSameDay(parseISO(w.workout_date), date));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card shadow-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-black">RunFree</h1>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Stats Row */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-hero rounded-xl">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">
                    {workouts.reduce((sum, w) => sum + (w.distance || 0), 0).toFixed(1)} mi
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {workouts.filter((w) => w.completed_workouts.length > 0).length}/
                    {workouts.length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent rounded-xl">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Training Days</p>
                  <p className="text-2xl font-bold">{workouts.filter((w) => w.workout_type !== "Rest").length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Weekly Calendar */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Weekly Schedule</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePreviousWeek}>
                  Previous
                </Button>
                <Button variant="outline" onClick={handleNextWeek}>
                  Next
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {getWeekDays().map((day) => {
                const workout = getWorkoutForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCompleted = workout?.completed_workouts.length ?? 0 > 0;

                return (
                  <Card
                    key={day.toISOString()}
                    className={`p-4 cursor-pointer transition-all hover:shadow-card ${
                      isToday ? "ring-2 ring-primary" : ""
                    } ${isCompleted ? "bg-muted/50" : ""}`}
                    onClick={() => workout && navigate(`/workout/${workout.id}`)}
                  >
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        {format(day, "EEE")}
                      </p>
                      <p className="text-lg font-bold mb-2">{format(day, "d")}</p>
                      {workout ? (
                        <>
                          <div className="text-sm font-semibold text-primary mb-1">
                            {workout.workout_type}
                          </div>
                          {workout.distance > 0 && (
                            <div className="text-sm text-muted-foreground">
                              {workout.distance} mi
                            </div>
                          )}
                          {isCompleted && (
                            <div className="mt-2 text-xs font-medium text-green-600">
                              ✓ Completed
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No workout</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Dashboard;
