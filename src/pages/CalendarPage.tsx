import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { Dumbbell, Activity, ChevronRight } from "lucide-react";

interface Workout {
  id: string;
  workout_date: string;
  workout_type: string;
  distance: number;
  description: string;
  completed_workouts: { id: string }[];
}

interface StrengthWorkout {
  id: string;
  name: string;
  scheduled_date: string;
  is_injury_focused: boolean;
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [strengthWorkouts, setStrengthWorkouts] = useState<StrengthWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<Date>(new Date());

  useEffect(() => {
    loadAllWorkouts();
  }, [month]);

  const loadAllWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      // Load running workouts
      const { data: plans } = await supabase
        .from("training_plans")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (plans && plans.length > 0) {
        const { data: workoutsData } = await supabase
          .from("workouts")
          .select(`*, completed_workouts(id)`)
          .eq("training_plan_id", plans[0].id)
          .gte("workout_date", format(monthStart, "yyyy-MM-dd"))
          .lte("workout_date", format(monthEnd, "yyyy-MM-dd"));

        setWorkouts(workoutsData || []);
      }

      // Load strength workouts
      const { data: strengthData } = await supabase
        .from("strength_workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("scheduled_date", format(monthStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(monthEnd, "yyyy-MM-dd"));

      setStrengthWorkouts(strengthData || []);
    } catch (error) {
      console.error("Error loading workouts:", error);
      toast.error("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  const getWorkoutsForDate = (date: Date) => {
    return workouts.filter(w => isSameDay(parseISO(w.workout_date), date));
  };

  const getStrengthForDate = (date: Date) => {
    return strengthWorkouts.filter(w => w.scheduled_date && isSameDay(parseISO(w.scheduled_date), date));
  };

  const selectedWorkouts = getWorkoutsForDate(selectedDate);
  const selectedStrength = getStrengthForDate(selectedDate);

  // Create day content for calendar
  const getDayContent = (day: Date) => {
    const hasRunning = workouts.some(w => isSameDay(parseISO(w.workout_date), day));
    const hasStrength = strengthWorkouts.some(w => w.scheduled_date && isSameDay(parseISO(w.scheduled_date), day));
    
    if (!hasRunning && !hasStrength) return null;
    
    return (
      <div className="flex gap-0.5 justify-center mt-0.5">
        {hasRunning && <div className="h-1 w-1 rounded-full bg-primary" />}
        {hasStrength && <div className="h-1 w-1 rounded-full bg-secondary" />}
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout title="Calendar">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Calendar">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card className="p-6 glass">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={month}
            onMonthChange={setMonth}
            className="w-full"
            components={{
              DayContent: ({ date }) => (
                <div className="relative">
                  <span>{date.getDate()}</span>
                  {getDayContent(date)}
                </div>
              ),
            }}
          />
          
          <div className="mt-4 flex gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Running</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-secondary" />
              <span className="text-muted-foreground">Strength</span>
            </div>
          </div>
        </Card>

        {/* Selected Day Details */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">
            {format(selectedDate, "EEEE, MMMM d")}
          </h3>

          {selectedWorkouts.length === 0 && selectedStrength.length === 0 ? (
            <Card className="p-6 glass text-center">
              <p className="text-muted-foreground">No workouts scheduled</p>
              <Button 
                className="mt-4 bg-gradient-primary"
                onClick={() => navigate("/strength")}
              >
                Add Strength Workout
              </Button>
            </Card>
          ) : (
            <>
              {/* Running Workouts */}
              {selectedWorkouts.map((workout) => {
                const isCompleted = workout.completed_workouts.length > 0;
                return (
                  <Card
                    key={workout.id}
                    className="p-4 glass hover:shadow-elevated transition-all cursor-pointer"
                    onClick={() => navigate(`/workout/${workout.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isCompleted ? "bg-gradient-success" : "bg-gradient-primary"}`}>
                        <Activity className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{workout.workout_type}</h4>
                        <p className="text-sm text-muted-foreground">
                          {workout.distance > 0 && `${workout.distance} miles`}
                          {workout.description && ` • ${workout.description}`}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                );
              })}

              {/* Strength Workouts */}
              {selectedStrength.map((workout) => (
                <Card
                  key={workout.id}
                  className="p-4 glass hover:shadow-elevated transition-all cursor-pointer"
                  onClick={() => navigate(`/strength/${workout.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${workout.is_injury_focused ? "bg-gradient-accent" : "bg-gradient-secondary"}`}>
                      <Dumbbell className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{workout.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {workout.is_injury_focused ? "Injury Recovery" : "Strength Training"}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default CalendarPage;
