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
  Heart
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
} from "recharts";
import { format, subWeeks, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";

interface WeeklyStats {
  week: string;
  distance: number;
  workouts: number;
}

interface CompletedWorkout {
  id: string;
  completed_at: string;
  actual_distance: number | null;
  rating: number | null;
}

interface CompletedStrength {
  id: string;
  completed_at: string;
  rating: number | null;
}

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyStats[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalStrength, setTotalStrength] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get completed workouts
      const { data: completedWorkouts, error: workoutsError } = await supabase
        .from("completed_workouts")
        .select("id, completed_at, actual_distance, rating")
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

      // Calculate weekly data for chart
      const weeks = eachWeekOfInterval({
        start: subWeeks(new Date(), 7),
        end: new Date(),
      });

      const weeklyStats = weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekWorkouts = (completedWorkouts || []).filter((w) => {
          const date = new Date(w.completed_at);
          return date >= weekStart && date <= weekEnd;
        });

        return {
          week: format(weekStart, "MMM d"),
          distance: weekWorkouts.reduce((sum, w) => sum + (w.actual_distance || 0), 0),
          workouts: weekWorkouts.length,
        };
      });

      setWeeklyData(weeklyStats);

      // Calculate streak (simplified - consecutive weeks with workouts)
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
        <Card className="p-4 glass">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Flame className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="text-2xl font-bold">{totalDistance.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Total Miles</p>
          </div>
        </Card>
        
        <Card className="p-4 glass">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-secondary flex items-center justify-center">
              <Activity className="h-5 w-5 text-secondary-foreground" />
            </div>
            <p className="text-2xl font-bold">{totalWorkouts}</p>
            <p className="text-xs text-muted-foreground">Runs Completed</p>
          </div>
        </Card>
        
        <Card className="p-4 glass">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-accent flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-accent-foreground" />
            </div>
            <p className="text-2xl font-bold">{totalStrength}</p>
            <p className="text-xs text-muted-foreground">Strength Sessions</p>
          </div>
        </Card>
        
        <Card className="p-4 glass">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-success flex items-center justify-center">
              <Trophy className="h-5 w-5 text-success-foreground" />
            </div>
            <p className="text-2xl font-bold">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">Week Streak</p>
          </div>
        </Card>
      </div>

      {/* Weekly Distance Chart */}
      <Card className="p-6 glass mb-6">
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
        
        <div className="grid md:grid-cols-3 gap-6">
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
