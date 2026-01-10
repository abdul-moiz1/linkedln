import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { SiLinkedin } from "react-icons/si";
import { 
  Sparkles, 
  Check,
  Zap,
  Layout,
  Globe
} from "lucide-react";
import Header from "@/components/Header";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

const pricingPlans = [
  {
    name: "Starter",
    price: "50",
    description: "Perfect for individuals starting their journey.",
    features: ["5 AI Carousels per month", "Standard Templates", "LinkedIn Direct Post", "7-Day Free Trial"],
    buttonText: "Start Free Trial",
    highlight: false
  },
  {
    name: "Intermediate",
    price: "100",
    description: "Great for growing creators and professionals.",
    features: ["20 AI Carousels per month", "Premium Templates", "Advanced AI Image Gen", "Priority Support", "7-Day Free Trial"],
    buttonText: "Start Free Trial",
    highlight: true
  },
  {
    name: "Pro",
    price: "150",
    description: "For agencies and power users.",
    features: ["Unlimited AI Carousels", "Custom Branding", "Bulk Generation", "24/7 Dedicated Manager", "7-Day Free Trial"],
    buttonText: "Start Free Trial",
    highlight: false
  }
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery({ queryKey: ["/api/user"] });

  useEffect(() => {
    if (!isLoading && user && user.onboardingCompleted !== "true") {
      setLocation("/onboarding");
    }
  }, [user, isLoading, setLocation]);

  const handleAction = () => {
    if (user) {
      setLocation("/create");
    } else {
      window.location.href = "/auth/linkedin";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              LinkedIn Carousels <br /> Made Simple
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Transform your ideas into professional LinkedIn carousels in seconds with AI. No design skills required.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" onClick={handleAction} className="h-12 px-8 text-lg font-medium">
                <Zap className="mr-2 h-5 w-5" /> Get Started Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="h-12 px-8 text-lg font-medium">
                View Pricing
              </Button>
            </div>
          </motion.div>
        </div>
        
        {/* Background Decor */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Choose the plan that's right for you. All plans include a 7-day free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, idx) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className={`relative flex flex-col h-full border-2 ${plan.highlight ? 'border-primary shadow-xl scale-105 z-10' : 'border-border'}`}>
                  {plan.highlight && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                      <span className="ml-1 text-sm font-semibold text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center text-sm">
                          <Check className="h-4 w-4 text-primary mr-3 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={handleAction} 
                      className="w-full" 
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.buttonText}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Carousel.AI</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Carousel.AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
