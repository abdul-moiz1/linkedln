import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  Sparkles, 
  Check,
  Zap,
  ArrowRight
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
    description: "Essential tools for personal branding.",
    features: ["5 AI Carousels per month", "Standard Templates", "LinkedIn Direct Post", "7-Day Free Trial"],
    buttonText: "Start Trial",
    highlight: false
  },
  {
    name: "Intermediate",
    price: "100",
    description: "Advanced features for professionals.",
    features: ["20 AI Carousels per month", "Premium Templates", "Advanced AI Image Gen", "Priority Support", "7-Day Free Trial"],
    buttonText: "Start Trial",
    highlight: true
  },
  {
    name: "Pro",
    price: "150",
    description: "Complete solution for power users.",
    features: ["Unlimited AI Carousels", "Custom Branding", "Bulk Generation", "24/7 Support", "7-Day Free Trial"],
    buttonText: "Start Trial",
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
    <div className="min-h-screen bg-background selection:bg-primary/10 selection:text-primary">
      <Header />

      <main>
        {/* Elegant Hero Section */}
        <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-medium mb-8">
                  <Sparkles className="w-3 h-3" />
                  <span>The new standard for LinkedIn content</span>
                </div>
                
                <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-8 leading-[1.1] bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Stunning carousels <br /> powered by AI.
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                  Join 10,000+ creators using Carousel.AI to transform their ideas into professional LinkedIn content in seconds.
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <Button size="lg" onClick={handleAction} className="h-14 px-10 text-base font-semibold rounded-full shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                    Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="ghost" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="h-14 px-10 text-base font-semibold rounded-full">
                    View Pricing
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
          
          {/* Abstract background elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
          </div>
        </section>

        {/* Minimal How It Works */}
        <section id="how-it-works" className="py-32 border-t">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 max-w-5xl mx-auto">
              {[
                { title: "Connect", description: "Connect your LinkedIn profile in one click." },
                { title: "Generate", description: "Describe your idea and let AI handle the design." },
                { title: "Publish", description: "Download or post directly to your feed." }
              ].map((step, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="text-4xl font-light text-primary/20 italic">0{idx + 1}</div>
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Elegant Pricing */}
        <section id="pricing" className="py-32 bg-slate-50/50 dark:bg-slate-900/50 border-y">
          <div className="container mx-auto px-6">
            <div className="text-center mb-24">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Pricing</h2>
              <p className="text-muted-foreground">Select a plan to start your 7-day free trial.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pricingPlans.map((plan, idx) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Card className={`relative flex flex-col h-full border-none bg-background shadow-lg shadow-black/[0.03] transition-transform hover:scale-[1.02] ${plan.highlight ? 'ring-2 ring-primary' : ''}`}>
                    <CardHeader className="pt-10">
                      <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                      <div className="mt-4 flex items-baseline">
                        <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                        <span className="ml-1 text-sm font-medium text-muted-foreground">/mo</span>
                      </div>
                      <CardDescription className="pt-2">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 pt-6">
                      <ul className="space-y-4">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-primary mr-3 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="pb-10 pt-6">
                      <Button 
                        onClick={handleAction} 
                        className="w-full h-12 rounded-full font-semibold" 
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
      </main>

      <footer className="py-12 border-t text-sm text-muted-foreground">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Carousel.AI</span>
          </div>
          <div className="flex gap-10">
            <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
            <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          </div>
          <p>© {new Date().getFullYear()} Carousel.AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
