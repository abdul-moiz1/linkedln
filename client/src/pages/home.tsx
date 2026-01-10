import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { SiLinkedin } from "react-icons/si";
import { 
  Sparkles, 
  Check,
  Zap,
  Layout,
  Globe,
  FileImage,
  Upload,
  Save,
  Link2,
  PenLine,
  Wand2,
  Layers,
  Send,
  Shield,
  RefreshCw,
  Twitter,
  Mail
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

  const handleStartCreating = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section (Previous Design Style) */}
      <section className="relative overflow-hidden pt-8 pb-20 lg:pt-16 lg:pb-32">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-blue-900/60 to-indigo-900/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
        
        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
              Create Stunning LinkedIn Carousels<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">in Minutes</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-200 mb-10 max-w-2xl mx-auto leading-relaxed">
              Turn your ideas into clean, scroll-worthy carousel posts. Generate visuals, 
              edit your text, and download your PDF in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                onClick={handleAction}
                size="lg"
                className="group gap-2 bg-white text-slate-900 hover:bg-slate-100 text-lg px-10 py-6 shadow-xl shadow-black/20 hover:shadow-2xl transition-all duration-300 hover:scale-105 font-semibold"
                data-testid="button-start-creating"
              >
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform text-blue-600" />
                Start Creating
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm text-lg px-10 py-6 font-semibold"
              >
                View Pricing
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section (Previous Design Style) */}
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
              Simple Process
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Create stunning LinkedIn carousels in five simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {[
              { step: "1", icon: Link2, title: "Paste a URL", description: "Turn any blog article into a carousel summary", gradient: "from-blue-500 to-purple-600" },
              { step: "2", icon: PenLine, title: "Write Your Messages", description: "Enter short text inputs that tell your story", gradient: "from-blue-500 to-blue-600" },
              { step: "3", icon: Wand2, title: "AI Generates Images", description: "Beautiful, professional images from your text", gradient: "from-violet-500 to-purple-600" },
              { step: "4", icon: Layers, title: "Convert to PDF", description: "Combined into a carousel-ready PDF", gradient: "from-indigo-500 to-blue-600" },
              { step: "5", icon: Send, title: "Upload to LinkedIn", description: "Publish directly to your LinkedIn profile", gradient: "from-blue-600 to-indigo-600" }
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="text-center p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-2 h-full">
                  <div className="relative inline-block mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-blue-600 text-blue-600 text-xs font-bold flex items-center justify-center shadow-md">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900">
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
      <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-400 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl" />
        </div>
        
        <div className="container relative mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-white">LinkedIn Carousel Maker</span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-sm mb-6">
                Create stunning AI-generated carousels and share them directly to LinkedIn. 
              </p>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p>© {new Date().getFullYear()} LinkedIn Carousel Maker. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
