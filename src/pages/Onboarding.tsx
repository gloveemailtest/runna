import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [weeklyMileage, setWeeklyMileage] = useState("");
  const [longestRun, setLongestRun] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [goalHours, setGoalHours] = useState("");
  const [goalMinutes, setGoalMinutes] = useState("");
  const [trainingDays, setTrainingDays] = useState("");

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          current_weekly_mileage: parseInt(weeklyMileage),
          longest_recent_run: parseFloat(longestRun),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Generate training plan
      const goalTimeMinutes = parseInt(goalHours) * 60 + parseInt(goalMinutes);
      
      const { data, error } = await supabase.functions.invoke("generate-training-plan", {
        body: {
          weeklyMileage: parseInt(weeklyMileage),
          longestRun: parseFloat(longestRun),
          raceDate,
          goalTimeMinutes,
          trainingDaysPerWeek: parseInt(trainingDays),
        },
      });

      if (error) throw error;

      toast.success("Your personalized training plan is ready!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Failed to create training plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-2xl shadow-elevated">
          <CardHeader>
            <div className="mb-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                Step {step} of {totalSteps}
              </p>
            </div>
            <CardTitle className="text-3xl font-black">
              {step === 1 && "Your Current Fitness"}
              {step === 2 && "Your Marathon Goal"}
              {step === 3 && "Training Availability"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Tell us about your current running fitness"}
              {step === 2 && "When are you racing and what's your target time?"}
              {step === 3 && "How many days per week can you train?"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="weeklyMileage">Current Weekly Mileage (miles)</Label>
                    <Input
                      id="weeklyMileage"
                      type="number"
                      placeholder="e.g., 25"
                      value={weeklyMileage}
                      onChange={(e) => setWeeklyMileage(e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longestRun">Longest Recent Run (miles)</Label>
                    <Input
                      id="longestRun"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 10.5"
                      value={longestRun}
                      onChange={(e) => setLongestRun(e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="raceDate">Race Date</Label>
                    <Input
                      id="raceDate"
                      type="date"
                      value={raceDate}
                      onChange={(e) => setRaceDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Goal Marathon Time</Label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Hours"
                          value={goalHours}
                          onChange={(e) => setGoalHours(e.target.value)}
                          min="2"
                          max="6"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Minutes"
                          value={goalMinutes}
                          onChange={(e) => setGoalMinutes(e.target.value)}
                          min="0"
                          max="59"
                          required
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      e.g., 3 hours 30 minutes = 3:30
                    </p>
                  </div>
                </>
              )}

              {step === 3 && (
                <div className="space-y-2">
                  <Label htmlFor="trainingDays">Training Days Per Week</Label>
                  <Input
                    id="trainingDays"
                    type="number"
                    placeholder="e.g., 5"
                    value={trainingDays}
                    onChange={(e) => setTrainingDays(e.target.value)}
                    min="3"
                    max="7"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    We recommend 4-6 days per week for optimal results
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                )}
                {step < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex-1"
                    disabled={
                      (step === 1 && (!weeklyMileage || !longestRun)) ||
                      (step === 2 && (!raceDate || !goalHours || !goalMinutes))
                    }
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    className="flex-1"
                    disabled={loading || !trainingDays}
                  >
                    {loading ? "Generating Plan..." : "Create My Plan"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
};

export default Onboarding;
