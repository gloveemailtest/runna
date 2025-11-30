import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, TrendingUp, Calendar, Flame, Target, Zap } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
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
  const [userName, setUserName] = useState("");

  useEffect(() => {
    loadWorkouts();
    loadUserProfile();
  }, [weekStart]);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profile?.full_name) {
        setUserName(profile.full_name.split(" ")[0]);
      }
    }
  };

  const loadWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      const weekEnd = addDays(weekStart, 7);
      
      const { data: workoutsData, error } = await supabase
        .from("workouts")
        .select(`*, completed_workouts(id)`)
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

  const getWeekDays = () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const getWorkoutForDay = (date: Date) => workouts.find((w) => isSameDay(parseISO(w.workout_date), date));

  const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);
  const completedCount = workouts.filter((w) => w.completed_workouts.length > 0).length;
  const trainingDays = workouts.filter((w) => w.workout_type !== "Rest").length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          Hey{userName ? `, ${userName}` : ""} <span className="wave">👋</span>
        </h1>
        <p className="text-muted-foreground">Let's crush your goals this week</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 glass hover:shadow-elevated transition-all group">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Flame className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDistance.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Miles This Week</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 glass hover:shadow-elevated transition-all group">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Target className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}/{trainingDays}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 glass hover:shadow-elevated transition-all group">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-accent flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{trainingDays}</p>
              <p className="text-xs text-muted-foreground">Training Days</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 glass hover:shadow-elevated transition-all group">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-success flex items-center justify-center group-hover:scale-110 transition-transform">
              <Trophy className="h-5 w-5 text-success-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.round((completedCount / (trainingDays || 1)) * 100)}%</p>
              <p className="text-xs text-muted-foreground">Consistency</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Weekly Calendar */}
      <Card className="p-6 glass">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">This Week</h3>
            <p className="text-sm text-muted-foreground">
              {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              ←
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              →
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {getWeekDays().map((day) => {
            const workout = getWorkoutForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCompleted = (workout?.completed_workouts.length ?? 0) > 0;

            return (
              <div
                key={day.toISOString()}
                className={`
                  p-3 rounded-xl cursor-pointer transition-all text-center
                  ${isToday ? "ring-2 ring-primary ring-offset-2" : ""}
                  ${isCompleted ? "bg-gradient-success/20" : "bg-muted/50 hover:bg-muted"}
                  ${workout ? "hover:shadow-card" : ""}
                `}
                onClick={() => workout && navigate(`/workout/${workout.id}`)}
              >
                <p className="text-xs text-muted-foreground mb-1">{format(day, "EEE")}</p>
                <p className="text-lg font-bold mb-1">{format(day, "d")}</p>
                {workout ? (
                  <>
                    <div className={`text-xs font-medium ${isCompleted ? "text-success" : "text-primary"} truncate`}>
                      {workout.workout_type}
                    </div>
                    {workout.distance > 0 && (
                      <p className="text-xs text-muted-foreground">{workout.distance}mi</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Rest</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Today's Workout Quick View */}
      {(() => {
        const todayWorkout = getWorkoutForDay(new Date());
        if (!todayWorkout) return null;
        const isCompleted = todayWorkout.completed_workouts.length > 0;
        
        return (
          <Card className="mt-6 p-6 glass border-primary/20">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-primary font-medium mb-1">Today's Workout</p>
                <h3 className="text-2xl font-bold mb-2">{todayWorkout.workout_type}</h3>
                <p className="text-muted-foreground mb-4">{todayWorkout.description}</p>
                <div className="flex gap-4 text-sm">
                  {todayWorkout.distance > 0 && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      {todayWorkout.distance} miles
                    </span>
                  )}
                  {todayWorkout.pace_target && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-secondary" />
                      {todayWorkout.pace_target}
                    </span>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => navigate(`/workout/${todayWorkout.id}`)}
                className={isCompleted ? "bg-gradient-success" : "bg-gradient-primary"}
              >
                {isCompleted ? "View Details" : "Start Workout"}
              </Button>
            </div>
          </Card>
        );
      })()}
    </AppLayout>
  );
};

export default Dashboard;
