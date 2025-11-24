import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-20 px-4 bg-gradient-hero">
      <div className="container mx-auto text-center text-white animate-fade-in">
        <h2 className="text-4xl md:text-6xl font-black mb-6">
          Ready to Start Your Journey?
        </h2>
        <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto opacity-95">
          Join thousands of runners training smarter with free, personalized plans
        </p>
        <Button 
          size="lg" 
          variant="secondary"
          className="text-lg px-8 py-6 font-bold shadow-elevated hover:scale-105 transition-all"
          onClick={() => window.location.href = "/auth"}
        >
          Create Your Free Plan <ArrowRight className="ml-2" />
        </Button>
        <p className="mt-6 text-sm opacity-80">
          No credit card required • Takes less than 2 minutes
        </p>
      </div>
    </section>
  );
};

export default CTA;
