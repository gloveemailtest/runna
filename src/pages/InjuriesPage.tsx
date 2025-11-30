import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Plus, Heart, AlertTriangle, CheckCircle, Trash2, Sparkles, Dumbbell, TrendingDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Injury {
  id: string;
  body_part: string;
  severity: string;
  description: string;
  injury_date: string;
  is_active: boolean;
  notes: string;
  pain_level?: number;
}

interface RehabExercise {
  id: string;
  name: string;
  description: string;
  target_muscles: string[];
  helps_with_injuries: string[];
  difficulty: string;
  instructions: string[];
}

const BODY_PARTS = [
  "neck", "shoulder", "upper_back", "lower_back", "chest",
  "bicep", "tricep", "forearm", "wrist", "hand",
  "hip", "glute", "quad", "hamstring", "knee",
  "calf", "shin", "ankle", "foot", "it_band", "groin"
];

const InjuriesPage = () => {
  const navigate = useNavigate();
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [rehabExercises, setRehabExercises] = useState<RehabExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [painLevels, setPainLevels] = useState<Record<string, number>>({});
  
  // Form state
  const [bodyPart, setBodyPart] = useState("");
  const [severity, setSeverity] = useState("mild");
  const [description, setDescription] = useState("");
  const [injuryDate, setInjuryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [initialPainLevel, setInitialPainLevel] = useState(5);

  useEffect(() => {
    loadInjuries();
    loadRehabExercises();
  }, []);

  const loadInjuries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_injuries")
        .select("*")
        .eq("user_id", user.id)
        .order("injury_date", { ascending: false });

      if (error) throw error;
      setInjuries(data || []);
      
      // Initialize pain levels
      const painMap: Record<string, number> = {};
      data?.forEach((injury) => {
        painMap[injury.id] = injury.pain_level || 5;
      });
      setPainLevels(painMap);
    } catch (error) {
      console.error("Error loading injuries:", error);
      toast.error("Failed to load injuries");
    } finally {
      setLoading(false);
    }
  };

  const loadRehabExercises = async () => {
    try {
      const { data, error } = await supabase
        .from("strength_exercises")
        .select("*")
        .not("helps_with_injuries", "is", null);

      if (error) throw error;
      setRehabExercises(data || []);
    } catch (error) {
      console.error("Error loading rehab exercises:", error);
    }
  };

  const handleAddInjury = async () => {
    if (!bodyPart) {
      toast.error("Please select a body part");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("user_injuries").insert({
        user_id: user.id,
        body_part: bodyPart as any,
        severity: severity as any,
        description,
        injury_date: injuryDate,
        is_active: true,
        pain_level: initialPainLevel,
      });

      if (error) throw error;

      toast.success("Injury logged successfully");
      setDialogOpen(false);
      setBodyPart("");
      setSeverity("mild");
      setDescription("");
      setInitialPainLevel(5);
      loadInjuries();
    } catch (error) {
      console.error("Error adding injury:", error);
      toast.error("Failed to log injury");
    }
  };

  const updatePainLevel = async (injuryId: string, level: number) => {
    setPainLevels((prev) => ({ ...prev, [injuryId]: level }));
    
    try {
      const { error } = await supabase
        .from("user_injuries")
        .update({ pain_level: level })
        .eq("id", injuryId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating pain level:", error);
      toast.error("Failed to update pain level");
    }
  };

  const toggleInjuryStatus = async (injury: Injury) => {
    try {
      const { error } = await supabase
        .from("user_injuries")
        .update({ is_active: !injury.is_active })
        .eq("id", injury.id);

      if (error) throw error;
      loadInjuries();
      toast.success(injury.is_active ? "Marked as recovered!" : "Marked as active");
    } catch (error) {
      console.error("Error updating injury:", error);
      toast.error("Failed to update injury");
    }
  };

  const deleteInjury = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_injuries")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadInjuries();
      toast.success("Injury removed");
    } catch (error) {
      console.error("Error deleting injury:", error);
      toast.error("Failed to delete injury");
    }
  };

  const generateRecoveryPlan = async () => {
    const activeInjuries = injuries.filter(i => i.is_active);
    if (activeInjuries.length === 0) {
      toast.error("No active injuries to create a recovery plan for");
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in again");
        setGenerating(false);
        return;
      }

      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out. Please try again.")), 60000); // 60 second timeout
      });

      const functionPromise = supabase.functions.invoke("generate-strength-plan", {
        body: { injuries: activeInjuries },
      });

      const response = await Promise.race([functionPromise, timeoutPromise]) as any;

      // Check for errors in response
      if (response.error) {
        const errorMessage = response.error.message || response.error.error || "Failed to generate recovery plan";
        throw new Error(errorMessage);
      }

      // Check if response.data has an error
      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Check if response was successful
      if (response.data?.success !== true && !response.data?.workoutId) {
        throw new Error("Recovery plan generation failed. Please try again.");
      }

      toast.success("Recovery strength plan created!");
      navigate("/strength");
    } catch (error: any) {
      console.error("Error generating plan:", error);
      const errorMessage = error.message || "Failed to generate recovery plan. Please check your connection and try again.";
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const activeInjuries = injuries.filter((i) => i.is_active);
  const recoveredInjuries = injuries.filter((i) => !i.is_active);

  const getRecommendedExercises = (bodyPart: string) => {
    return rehabExercises.filter((exercise) =>
      exercise.helps_with_injuries?.some((injury) =>
        injury.toLowerCase().includes(bodyPart.toLowerCase())
      )
    ).slice(0, 3);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "mild": return "bg-warning/20 text-warning";
      case "moderate": return "bg-accent/20 text-accent";
      case "severe": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPainColor = (level: number) => {
    if (level <= 3) return "text-success";
    if (level <= 6) return "text-warning";
    return "text-destructive";
  };

  const formatBodyPart = (part: string) => {
    return part.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <AppLayout title="Injury Tracking">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Injury Tracking">
      {/* Action Bar */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" /> Log Injury
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Log an Injury</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Body Part</Label>
                <Select value={bodyPart} onValueChange={setBodyPart}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_PARTS.map((part) => (
                      <SelectItem key={part} value={part}>
                        {formatBodyPart(part)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild - Minor discomfort</SelectItem>
                    <SelectItem value="moderate">Moderate - Noticeable pain</SelectItem>
                    <SelectItem value="severe">Severe - Limiting activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Initial Pain Level: {initialPainLevel}/10</Label>
                <Slider
                  value={[initialPainLevel]}
                  onValueChange={([value]) => setInitialPainLevel(value)}
                  max={10}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>No pain</span>
                  <span>Severe</span>
                </div>
              </div>
              
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={injuryDate}
                  onChange={(e) => setInjuryDate(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened? How does it feel?"
                  rows={3}
                />
              </div>
              
              <Button onClick={handleAddInjury} className="w-full bg-gradient-primary">
                Log Injury
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {activeInjuries.length > 0 && (
          <Button
            variant="outline"
            onClick={generateRecoveryPlan}
            disabled={generating}
            className="border-primary text-primary hover:bg-primary/10"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Recovery Plan
              </>
            )}
          </Button>
        )}
      </div>

      {/* Active Injuries */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Active Injuries ({activeInjuries.length})
        </h3>
        
        {activeInjuries.length === 0 ? (
          <Card className="p-6 glass text-center">
            <Heart className="h-12 w-12 mx-auto text-success mb-4" />
            <p className="text-lg font-medium">You're injury-free!</p>
            <p className="text-muted-foreground">Keep up the great work</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeInjuries.map((injury) => {
              const currentPain = painLevels[injury.id] || injury.pain_level || 5;
              const recommendedExercises = getRecommendedExercises(injury.body_part);
              
              return (
                <Card key={injury.id} className="p-4 glass">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{formatBodyPart(injury.body_part)}</h4>
                      <p className="text-sm text-muted-foreground">
                        Since {format(new Date(injury.injury_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(injury.severity)}`}>
                      {injury.severity}
                    </span>
                  </div>
                  
                  {injury.description && (
                    <p className="text-sm text-muted-foreground mb-4">{injury.description}</p>
                  )}

                  {/* Pain Level Slider */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Current Pain Level</Label>
                      <span className={`text-sm font-bold ${getPainColor(currentPain)}`}>
                        {currentPain}/10
                      </span>
                    </div>
                    <Slider
                      value={[currentPain]}
                      onValueChange={([value]) => updatePainLevel(injury.id, value)}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>No pain</span>
                      <span>Severe</span>
                    </div>
                    {currentPain < (injury.pain_level || 5) && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-success">
                        <TrendingDown className="h-3 w-3" />
                        <span>Pain decreasing</span>
                      </div>
                    )}
                  </div>

                  {/* Recommended Rehab Exercises */}
                  {recommendedExercises.length > 0 && (
                    <div className="mb-4">
                      <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        Recommended Exercises
                      </Label>
                      <div className="space-y-2">
                        {recommendedExercises.map((exercise) => (
                          <div
                            key={exercise.id}
                            className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => navigate("/strength")}
                          >
                            <p className="text-sm font-medium">{exercise.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {exercise.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleInjuryStatus(injury)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Mark Recovered
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteInjury(injury.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Injury History Table */}
      {injuries.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Injury History</h3>
          <Card className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Body Part</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Pain Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {injuries.map((injury) => {
                    const currentPain = painLevels[injury.id] || injury.pain_level || 0;
                    return (
                      <TableRow key={injury.id}>
                        <TableCell className="font-medium">
                          {formatBodyPart(injury.body_part)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(injury.severity)}`}>
                            {injury.severity}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(injury.injury_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {currentPain > 0 ? (
                            <span className={`font-medium ${getPainColor(currentPain)}`}>
                              {currentPain}/10
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {injury.is_active ? (
                            <Badge className="bg-warning/20 text-warning">Active</Badge>
                          ) : (
                            <Badge className="bg-success/20 text-success">Recovered</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteInjury(injury.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* Recovered Injuries */}
      {recoveredInjuries.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Recovered ({recoveredInjuries.length})
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recoveredInjuries.map((injury) => (
              <Card key={injury.id} className="p-4 glass opacity-70">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{formatBodyPart(injury.body_part)}</h4>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(injury.injury_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteInjury(injury.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default InjuriesPage;
