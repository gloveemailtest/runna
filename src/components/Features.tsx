import { Card } from "@/components/ui/card";
import { Target, Calendar, Zap, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Smart Pace Targets",
    description: "AI calculates your optimal training paces based on your goal time and current fitness level.",
  },
  {
    icon: Calendar,
    title: "Personalized Plans",
    description: "Custom training schedules that adapt to your available days and race timeline.",
  },
  {
    icon: Zap,
    title: "Daily Workouts",
    description: "Detailed workouts with warm-ups, intervals, tempo runs, and recovery guidance.",
  },
  {
    icon: TrendingUp,
    title: "Progressive Training",
    description: "Scientifically-structured plans that build your fitness safely over time.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional-grade training features without the subscription fees
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 bg-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 border-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mb-4 inline-flex p-3 bg-gradient-hero rounded-xl shadow-md">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
