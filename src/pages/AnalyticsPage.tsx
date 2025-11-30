import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { 
  TrendingUp, 
  Flame, 
  Target, 
  Calendar,
  Trophy,
  Activity,
  Dumbbell,
  Heart,
  Gauge,
  Zap
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { format, subWeeks, startOfWeek, endOfWeek, eachWeekOfInterval, parseISO } from "date-fns";

interface WeeklyStats {
  week: string;
  distance: number;
  workouts: number;
  avgPace?: number;
  trainingLoad?: number;
  consistency?: number;
}

interface CompletedWorkout {
  id: string;
  completed_at: string;
  actual_distance: number | null;
  actual_pace: string | null;
  rating: number | null;
  workout: {
    workout_type: string;
    distance: number;
  } | null;
}

interface CompletedStrength {
  id: string;
  completed_at: string;
  rating: number | null;
}

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyStats[]>([]);
  const [paceData, setPaceData] = useState<Array<{ date: string; pace: number }>>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalStrength, setTotalStrength] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [avgPace, setAvgPace] = useState(0);
  const [consistency, setConsistency] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const parsePace = (paceStr: string | null): number => {
    if (!paceStr) return 0;
    // Parse "8:30" format to minutes
    const parts = paceStr.split(":");
    if (parts.length === 2) {
      return parseFloat(parts[0]) + parseFloat(parts[1]) / 60;
    }
    return 0;
  };

  const formatPace = (minutes: number): string => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get completed workouts with workout details
      const { data: completedWorkouts, error: workoutsError } = await supabase
        .from("completed_workouts")
        .select(`
          id, 
          completed_at, 
          actual_distance, 
          actual_pace,
          rating,
          workout:workouts(workout_type, distance)
        `)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: true });

      if (workoutsError) throw workoutsError;

      // Get completed strength workouts
      const { data: completedStrength, error: strengthError } = await supabase
        .from("completed_strength_workouts")
        .select("id, completed_at, rating")
        .eq("user_id", user.id);

      if (strengthError) throw strengthError;

      // Calculate totals
      const distance = (completedWorkouts || []).reduce(
        (sum, w) => sum + (w.actual_distance || 0),
        0
      );
      setTotalDistance(distance);
      setTotalWorkouts(completedWorkouts?.length || 0);
      setTotalStrength(completedStrength?.length || 0);

      // Calculate average rating
      const allRatings = [
        ...(completedWorkouts || []).filter(w => w.rating).map(w => w.rating!),
        ...(completedStrength || []).filter(w => w.rating).map(w => w.rating!),
      ];
      const avgRate = allRatings.length > 0 
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length 
        : 0;
      setAvgRating(avgRate);

      // Calculate average pace
      const paces = (completedWorkouts || [])
        .filter(w => w.actual_pace)
        .map(w => parsePace(w.actual_pace));
      const avgPaceValue = paces.length > 0
        ? paces.reduce((a, b) => a + b, 0) / paces.length
        : 0;
      setAvgPace(avgPaceValue);

      // Calculate weekly data for charts
      const weeks = eachWeekOfInterval({
        start: subWeeks(new Date(), 7),
        end: new Date(),
      });

      const weeklyStats = weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekWorkouts = (completedWorkouts || []).filter((w) => {
          const date = parseISO(w.completed_at);
          return date >= weekStart && date <= weekEnd;
        });

        // Calculate average pace for the week
        const weekPaces = weekWorkouts
          .filter(w => w.actual_pace)
          .map(w => parsePace(w.actual_pace));
        const weekAvgPace = weekPaces.length > 0
          ? weekPaces.reduce((a, b) => a + b, 0) / weekPaces.length
          : 0;

        // Calculate training load (distance * intensity factor)
        const trainingLoad = weekWorkouts.reduce((sum, w) => {
          const dist = w.actual_distance || 0;
          const pace = w.actual_pace ? parsePace(w.actual_pace) : 0;
          // Lower pace = higher intensity, so we invert it
          const intensity = pace > 0 ? (10 - pace) / 10 : 0.5;
          return sum + (dist * intensity);
        }, 0);

        // Calculate consistency (percentage of days with workouts)
        const daysWithWorkouts = new Set(
          weekWorkouts.map(w => format(parseISO(w.completed_at), "yyyy-MM-dd"))
        ).size;
        const weekConsistency = (daysWithWorkouts / 7) * 100;

        return {
          week: format(weekStart, "MMM d"),
          distance: weekWorkouts.reduce((sum, w) => sum + (w.actual_distance || 0), 0),
          workouts: weekWorkouts.length,
          avgPace: weekAvgPace > 0 ? weekAvgPace : undefined,
          trainingLoad: trainingLoad > 0 ? Math.round(trainingLoad * 10) / 10 : undefined,
          consistency: weekConsistency,
        };
      });

      setWeeklyData(weeklyStats);

      // Calculate overall consistency
      const totalDaysWithWorkouts = new Set(
        (completedWorkouts || []).map(w => format(parseISO(w.completed_at), "yyyy-MM-dd"))
      ).size;
      const totalDays = Math.max(1, Math.ceil(
        (new Date().getTime() - parseISO((completedWorkouts || [])[0]?.completed_at || new Date().toISOString()).getTime()) / (1000 * 60 * 60 * 24)
      ));
      setConsistency(Math.min(100, (totalDaysWithWorkouts / totalDays) * 100));

      // Prepare pace trend data
      const paceTrendData = (completedWorkouts || [])
        .filter(w => w.actual_pace)
        .map(w => ({
          date: format(parseISO(w.completed_at), "MMM d"),
          pace: parsePace(w.actual_pace),
        }))
        .slice(-10); // Last 10 workouts
      setPaceData(paceTrendData);

      // Calculate streak (consecutive weeks with workouts)
      let streak = 0;
      for (let i = weeklyStats.length - 1; i >= 0; i--) {
        if (weeklyStats[i].workouts > 0) {
          streak++;
        } else {
          break;
        }
      }
      setCurrentStreak(streak);
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Progress Analytics">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Progress Analytics">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 glass hover:shadow-elevated transition-all group">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Flame className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="text-2xl font-bold">{totalDistance.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Total Miles</p>
          </div>
        </Card>
        
        <Card className="p-4 glass hover:shadow-elevated transition-all group">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="h-5 w-5 text-secondary-foreground" />
            </div>
            <p className="text-2xl font-bold">{totalWorkouts}</p>
            <p className="text-xs text-muted-foreground">Runs Completed</p>
          </div>
        </Card>
        
        <Card className="p-4 glass hover:shadow-elevated transition-all group">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-accent flex items-center justify-center group-hover:scale-110 transition-transform">
              <Dumbbell className="h-5 w-5 text-accent-foreground" />
            </div>
            <p className="text-2xl font-bold">{totalStrength}</p>
            <p className="text-xs text-muted-foreground">Strength Sessions</p>
          </div>
        </Card>
        
        <Card className="p-4 glass hover:shadow-elevated transition-all group">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-success flex items-center justify-center group-hover:scale-110 transition-transform">
              <Trophy className="h-5 w-5 text-success-foreground" />
            </div>
            <p className="text-2xl font-bold">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">Week Streak</p>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Weekly Distance Chart */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Weekly Distance
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="distance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pace Trends Chart */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-secondary" />
            Pace Trends
          </h3>
          <div className="h-64">
            {paceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={paceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatPace(value)}
                  />
                  <Line
                    type="monotone"
                    dataKey="pace"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No pace data available
              </div>
            )}
          </div>
          {avgPace > 0 && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Average Pace: <span className="font-semibold text-foreground">{formatPace(avgPace)}</span> /mile
            </p>
          )}
        </Card>
      </div>

      {/* Training Load and Consistency */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Training Load Chart */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            Training Load
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="trainingLoad"
                  stroke="hsl(var(--accent))"
                  fill="hsl(var(--accent))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Distance × Intensity Factor
          </p>
        </Card>

        {/* Consistency Chart */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-success" />
            Weekly Consistency
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `${value.toFixed(0)}%`}
                />
                <Bar
                  dataKey="consistency"
                  fill="hsl(var(--success))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Overall Consistency: <span className="font-semibold text-foreground">{consistency.toFixed(0)}%</span>
          </p>
        </Card>
      </div>

      {/* Workouts per Week Chart */}
      <Card className="p-6 glass mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-secondary" />
          Workouts per Week
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="workouts"
                fill="hsl(var(--secondary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Performance Summary */}
      <Card className="p-6 glass">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          Performance Summary
        </h3>
        
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-muted/30 rounded-xl">
            <p className="text-3xl font-bold gradient-text">{avgRating.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Avg Workout Rating</p>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-xl">
            <p className="text-3xl font-bold gradient-text">
              {totalWorkouts > 0 ? (totalDistance / totalWorkouts).toFixed(1) : 0}
            </p>
            <p className="text-sm text-muted-foreground">Avg Miles/Run</p>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-xl">
            <p className="text-3xl font-bold gradient-text">
              {avgPace > 0 ? formatPace(avgPace) : "-"}
            </p>
            <p className="text-sm text-muted-foreground">Avg Pace /mile</p>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-xl">
            <p className="text-3xl font-bold gradient-text">
              {totalWorkouts + totalStrength}
            </p>
            <p className="text-sm text-muted-foreground">Total Workouts</p>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
};

export default AnalyticsPage;
