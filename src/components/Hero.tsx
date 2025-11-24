import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-runner.jpg";

const Hero = () => {
  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Gradient Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(251, 94, 57, 0.85) 0%, rgba(30, 64, 175, 0.75) 100%), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white animate-fade-in">
        <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight">
          Train Smarter.<br />Race Faster.
        </h1>
        <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto font-medium opacity-95">
          Free personalized marathon training plans with AI-powered workouts, pace targets, and daily coaching.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-6 font-bold shadow-elevated hover:scale-105 transition-all"
            onClick={() => window.location.href = "/auth"}
          >
            Start Free Training <ArrowRight className="ml-2" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="text-lg px-8 py-6 font-bold border-2 border-white text-white hover:bg-white/10"
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          >
            How It Works
          </Button>
        </div>
        
        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-black mb-2">100%</div>
            <div className="text-sm uppercase tracking-wider opacity-90">Free Forever</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black mb-2">AI</div>
            <div className="text-sm uppercase tracking-wider opacity-90">Personalized Plans</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black mb-2">∞</div>
            <div className="text-sm uppercase tracking-wider opacity-90">Unlimited Access</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
