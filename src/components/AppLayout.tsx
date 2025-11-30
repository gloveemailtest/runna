import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  LogOut, 
  Dumbbell, 
  Activity,
  BarChart3,
  Home,
  Heart
} from "lucide-react";
import { toast } from "sonner";
import AuthGuard from "@/components/AuthGuard";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const navItems = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/calendar", icon: Calendar, label: "Calendar" },
  { path: "/strength", icon: Dumbbell, label: "Strength" },
  { path: "/injuries", icon: Heart, label: "Injuries" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
];

const AppLayout = ({ children, title }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      navigate("/");
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-page">
        {/* Background mesh */}
        <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />
        
        {/* Header */}
        <header className="sticky top-0 z-50 border-b glass">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold gradient-text">RunFree</h1>
            </div>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className={cn(
                    location.pathname === item.path && "bg-gradient-primary"
                  )}
                >
                  <Link to={item.path} className="gap-2 flex items-center">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              ))}
            </nav>

            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t glass">
          <div className="flex justify-around py-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                  location.pathname === item.path
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6 pb-24 md:pb-6 relative z-10">
          {title && (
            <h2 className="text-3xl font-bold mb-6">{title}</h2>
          )}
          {children}
        </main>
      </div>
    </AuthGuard>
  );
};

export default AppLayout;
