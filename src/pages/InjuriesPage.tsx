import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Heart, AlertTriangle, CheckCircle, Trash2, Sparkles } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Form state
  const [bodyPart, setBodyPart] = useState("");
  const [severity, setSeverity] = useState("mild");
  const [description, setDescription] = useState("");
  const [injuryDate, setInjuryDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    loadInjuries();
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
    } catch (error) {
      console.error("Error loading injuries:", error);
      toast.error("Failed to load injuries");
    } finally {
      setLoading(false);
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
      });

      if (error) throw error;

      toast.success("Injury logged successfully");
      setDialogOpen(false);
      setBodyPart("");
      setSeverity("mild");
      setDescription("");
      loadInjuries();
    } catch (error) {
      console.error("Error adding injury:", error);
      toast.error("Failed to log injury");
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
        return;
      }

      const response = await supabase.functions.invoke("generate-strength-plan", {
        body: { injuries: activeInjuries },
      });

      if (response.error) throw response.error;

      toast.success("Recovery strength plan created!");
      navigate("/strength");
    } catch (error: any) {
      console.error("Error generating plan:", error);
      toast.error(error.message || "Failed to generate recovery plan");
    } finally {
      setGenerating(false);
    }
  };

  const activeInjuries = injuries.filter((i) => i.is_active);
  const recoveredInjuries = injuries.filter((i) => !i.is_active);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "mild": return "bg-warning/20 text-warning";
      case "moderate": return "bg-accent/20 text-accent";
      case "severe": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
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
          <DialogContent>
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
            <Sparkles className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Generate Recovery Plan"}
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
            {activeInjuries.map((injury) => (
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
                  <p className="text-sm text-muted-foreground mb-3">{injury.description}</p>
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
            ))}
          </div>
        )}
      </div>

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
