import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiLinkedin } from "react-icons/si";
import { 
  Sparkles, 
  FileImage, 
  Upload, 
  Save, 
  Shield,
  Wand2,
  Layers,
  Send,
  PenLine,
  Mail,
  Twitter
} from "lucide-react";
import Header from "@/components/Header";

export default function Home() {
  const handleLinkedInLogin = () => {
    window.location.href = "/auth/linkedin";
  };

  const handleStartCreating = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white font-sans">
      <Header />

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden py-20 lg:py-32">
        {/* Background Image with Overlay - Darkened for better readability */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-blue-900/60 to-indigo-900/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-overlay filter blur-3xl opacity-30" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-overlay filter blur-3xl opacity-30" />
        
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            Create Stunning LinkedIn Carousels<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">in Minutes</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-200 mb-10 max-w-2xl mx-auto leading-relaxed">
            Turn your ideas into clean, scroll-worthy carousel posts. Generate visuals, 
            edit your text, and download your PDF in one place.
          </p>
          
          <div className="flex justify-center">
            <Button 
              onClick={handleStartCreating}
              size="lg"
              className="group gap-2 bg-white text-slate-900 hover:bg-slate-100 text-lg px-10 py-6 shadow-xl shadow-black/20 hover:shadow-2xl transition-all duration-300 hover:scale-105 font-semibold"
              data-testid="button-start-creating"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform text-blue-600" />
              Start Creating
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
              Simple Process
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Create stunning LinkedIn carousels in four simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                step: "1",
                icon: PenLine,
                title: "Write Your Messages",
                description: "Enter 4-5 short text inputs that tell your story or share your insights",
                gradient: "from-blue-500 to-blue-600"
              },
              {
                step: "2",
                icon: Wand2,
                title: "AI Generates Images",
                description: "Our AI creates beautiful, professional images from your text",
                gradient: "from-violet-500 to-purple-600"
              },
              {
                step: "3",
                icon: Layers,
                title: "Convert to PDF",
                description: "Images are automatically combined into a carousel-ready PDF",
                gradient: "from-indigo-500 to-blue-600"
              },
              {
                step: "4",
                icon: Send,
                title: "Upload to LinkedIn",
                description: "Publish directly to your LinkedIn profile with one click",
                gradient: "from-blue-600 to-indigo-600"
              }
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="text-center p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-2">
                  <div className="relative inline-block mb-6">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className="w-10 h-10 text-white" />
                    </div>
                    <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border-2 border-blue-600 text-blue-600 text-sm font-bold flex items-center justify-center shadow-md">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-200 to-indigo-200 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-4">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Powerful Features</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Everything you need to create engaging LinkedIn content
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Sparkles,
                title: "AI Image Generation",
                description: "Powered by Gemini & OpenAI to create stunning, unique visuals from your text",
                iconBg: "from-violet-500 to-purple-600"
              },
              {
                icon: FileImage,
                title: "PDF Carousel Builder",
                description: "Automatically converts your images into a perfectly formatted carousel document",
                iconBg: "from-blue-500 to-indigo-600"
              },
              {
                icon: Upload,
                title: "One-Click LinkedIn Upload",
                description: "Publish your carousel directly to LinkedIn without leaving the app",
                iconBg: "from-indigo-500 to-blue-600"
              },
              {
                icon: Save,
                title: "Draft Saving",
                description: "Save your work in progress and come back to finish it anytime",
                iconBg: "from-blue-600 to-violet-600"
              }
            ].map((feature, index) => (
              <Card 
                key={index} 
                className="group border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-white hover:-translate-y-1 overflow-visible"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                      <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* LinkedIn Login Callout */}
      <section className="py-24 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 right-0 w-72 h-72 bg-blue-300 rounded-full filter blur-3xl" />
          <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-indigo-300 rounded-full filter blur-3xl" />
        </div>
        
        <div className="container relative mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0A66C2] to-[#004182] mb-8 shadow-xl shadow-blue-500/25">
              <Shield className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Connect Your LinkedIn Account
            </h2>
            
            <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto leading-relaxed">
              Connect your LinkedIn account securely to publish carousels directly. 
              We use OAuth2 for secure authentication and never store your password.
            </p>
            
            <Button 
              onClick={handleLinkedInLogin}
              size="lg"
              className="group gap-3 bg-[#0A66C2] hover:bg-[#004182] text-lg px-10 py-6 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105"
              data-testid="button-connect-linkedin"
            >
              <SiLinkedin className="w-6 h-6 group-hover:scale-110 transition-transform" />
              Sign in with LinkedIn
            </Button>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Shield className="w-4 h-4" />
              Your data is encrypted and protected
            </div>
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
                Grow your professional presence effortlessly.
              </p>
              <div className="flex items-center gap-3">
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors duration-300"
                  aria-label="LinkedIn"
                >
                  <SiLinkedin className="w-5 h-5 text-slate-400 hover:text-white" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors duration-300"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5 text-slate-400" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors duration-300"
                  aria-label="Email"
                >
                  <Mail className="w-5 h-5 text-slate-400" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} LinkedIn Carousel Maker. All rights reserved.
            </p>
            <p className="text-sm text-slate-500">
              Made with <span className="text-red-400">love</span> for content creators
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
