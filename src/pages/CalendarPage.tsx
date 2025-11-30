import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { Dumbbell, Activity, ChevronRight, ChevronLeft, Calendar as CalendarIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("monthly");

  useEffect(() => {
    loadAllWorkouts();
  }, [month, weekStart, viewMode]);

  const loadAllWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let startDate: Date;
      let endDate: Date;

      if (viewMode === "weekly") {
        startDate = weekStart;
        endDate = addDays(weekStart, 7);
      } else {
        startDate = startOfMonth(month);
        endDate = endOfMonth(month);
      }

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
          .gte("workout_date", format(startDate, "yyyy-MM-dd"))
          .lte("workout_date", format(endDate, "yyyy-MM-dd"));

        setWorkouts(workoutsData || []);
      }

      // Load strength workouts
      const { data: strengthData } = await supabase
        .from("strength_workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("scheduled_date", format(startDate, "yyyy-MM-dd"))
        .lte("scheduled_date", format(endDate, "yyyy-MM-dd"));

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

  const getWorkoutColor = (workout: Workout) => {
    const isCompleted = workout.completed_workouts.length > 0;
    if (isCompleted) return "bg-gradient-success/30 border-success/50";
    
    switch (workout.workout_type.toLowerCase()) {
      case "easy run":
      case "recovery":
        return "bg-gradient-primary/30 border-primary/50";
      case "tempo":
      case "threshold":
        return "bg-gradient-secondary/30 border-secondary/50";
      case "interval":
      case "speed":
        return "bg-gradient-accent/30 border-accent/50";
      default:
        return "bg-gradient-primary/30 border-primary/50";
    }
  };

  // Create day content for calendar
  const getDayContent = (day: Date) => {
    const dayWorkouts = getWorkoutsForDate(day);
    const dayStrength = getStrengthForDate(day);
    
    if (dayWorkouts.length === 0 && dayStrength.length === 0) return null;
    
    return (
      <div className="flex gap-1 justify-center mt-1 flex-wrap">
        {dayWorkouts.map((w, i) => {
          const isCompleted = w.completed_workouts.length > 0;
          return (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                isCompleted ? "bg-success" : "bg-primary"
              }`}
            />
          );
        })}
        {dayStrength.map((w, i) => (
          <div
            key={`s-${i}`}
            className={`h-2 w-2 rounded-full ${
              w.is_injury_focused ? "bg-accent" : "bg-secondary"
            }`}
          />
        ))}
      </div>
    );
  };

  const getWeekDays = () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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
      {/* View Toggle */}
      <div className="mb-6">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "weekly" | "monthly")}>
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            <TabsTrigger value="monthly">Monthly View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar View */}
        <Card className="p-6 glass">
          {viewMode === "monthly" ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold">{format(month, "MMMM yyyy")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                month={month}
                onMonthChange={setMonth}
                className="w-full"
                components={{
                  DayContent: ({ date }) => (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <span>{date.getDate()}</span>
                      {getDayContent(date)}
                    </div>
                  ),
                }}
              />
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold">
                  {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {getWeekDays().map((day) => {
                  const dayWorkouts = getWorkoutsForDate(day);
                  const dayStrength = getStrengthForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        p-3 rounded-xl cursor-pointer transition-all text-center min-h-[100px]
                        ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}
                        ${isToday ? "bg-primary/10" : "bg-muted/30"}
                        hover:bg-muted/50
                      `}
                      onClick={() => setSelectedDate(day)}
                    >
                      <p className="text-xs text-muted-foreground mb-1">{format(day, "EEE")}</p>
                      <p className={`text-lg font-bold mb-2 ${isToday ? "text-primary" : ""}`}>
                        {format(day, "d")}
                      </p>
                      <div className="space-y-1">
                        {dayWorkouts.map((workout) => {
                          const isCompleted = workout.completed_workouts.length > 0;
                          return (
                            <div
                              key={workout.id}
                              className={`
                                text-xs p-1 rounded ${getWorkoutColor(workout)} border
                                ${isCompleted ? "opacity-60" : ""}
                              `}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/workout/${workout.id}`);
                              }}
                            >
                              <div className="font-medium truncate">{workout.workout_type}</div>
                              {workout.distance > 0 && (
                                <div className="text-[10px]">{workout.distance}mi</div>
                              )}
                            </div>
                          );
                        })}
                        {dayStrength.map((workout) => (
                          <div
                            key={workout.id}
                            className={`
                              text-xs p-1 rounded border
                              ${workout.is_injury_focused 
                                ? "bg-gradient-accent/30 border-accent/50" 
                                : "bg-gradient-secondary/30 border-secondary/50"}
                            `}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/strength/${workout.id}`);
                            }}
                          >
                            <Dumbbell className="h-3 w-3 inline mr-1" />
                            <span className="text-[10px] truncate">{workout.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          <div className="mt-4 flex gap-4 justify-center text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Running</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-secondary" />
              <span className="text-muted-foreground">Strength</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-accent" />
              <span className="text-muted-foreground">Injury Recovery</span>
            </div>
          </div>
        </Card>

        {/* Selected Day Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">
              {format(selectedDate, "EEEE, MMMM d")}
            </h3>
          </div>

          {selectedWorkouts.length === 0 && selectedStrength.length === 0 ? (
            <Card className="p-6 glass text-center">
              <p className="text-muted-foreground mb-4">No workouts scheduled</p>
              <Button 
                className="bg-gradient-primary"
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
                    className={`p-4 glass hover:shadow-elevated transition-all cursor-pointer border-2 ${getWorkoutColor(workout)}`}
                    onClick={() => navigate(`/workout/${workout.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        isCompleted ? "bg-gradient-success" : "bg-gradient-primary"
                      }`}>
                        <Activity className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{workout.workout_type}</h4>
                          {isCompleted && (
                            <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
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
                  className={`p-4 glass hover:shadow-elevated transition-all cursor-pointer border-2 ${
                    workout.is_injury_focused 
                      ? "bg-gradient-accent/30 border-accent/50" 
                      : "bg-gradient-secondary/30 border-secondary/50"
                  }`}
                  onClick={() => navigate(`/strength/${workout.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                      workout.is_injury_focused ? "bg-gradient-accent" : "bg-gradient-secondary"
                    }`}>
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
