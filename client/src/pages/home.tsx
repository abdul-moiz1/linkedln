import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiLinkedin } from "react-icons/si";
import { 
  Sparkles, 
  FileImage, 
  Upload, 
  Save, 
  MessageSquare,
  Image,
  FileText,
  Share2,
  Shield
} from "lucide-react";
import Header from "@/components/Header";

export default function Home() {
  const handleLinkedInLogin = () => {
    window.location.href = "/auth/linkedin";
  };

  const handleStartCreating = () => {
    window.location.href = "/auth/linkedin";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white font-sans">
      <Header />

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-50" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Create LinkedIn Carousels<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">in Minutes</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Turn your ideas into AI-generated images and post them to LinkedIn with one click. 
            No design skills required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleStartCreating}
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6"
              data-testid="button-start-creating"
            >
              <Sparkles className="w-5 h-5" />
              Start Creating
            </Button>
            
            <Button 
              onClick={handleLinkedInLogin}
              size="lg"
              variant="outline"
              className="gap-2 text-lg px-8 py-6 border-2 border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white"
              data-testid="button-linkedin-login"
            >
              <SiLinkedin className="w-5 h-5" />
              Sign in with LinkedIn
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Create stunning LinkedIn carousels in four simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                step: "1",
                icon: MessageSquare,
                title: "Write Your Messages",
                description: "Enter 4-5 short text inputs that tell your story or share your insights"
              },
              {
                step: "2",
                icon: Image,
                title: "AI Generates Images",
                description: "Our AI creates beautiful, professional images from your text"
              },
              {
                step: "3",
                icon: FileText,
                title: "Convert to PDF",
                description: "Images are automatically combined into a carousel-ready PDF"
              },
              {
                step: "4",
                icon: Share2,
                title: "Upload to LinkedIn",
                description: "Publish directly to your LinkedIn profile with one click"
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <item.icon className="w-10 h-10 text-blue-600" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-transparent -translate-x-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
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
                description: "Powered by Gemini & OpenAI to create stunning, unique visuals from your text"
              },
              {
                icon: FileImage,
                title: "PDF Carousel Builder",
                description: "Automatically converts your images into a perfectly formatted carousel document"
              },
              {
                icon: Upload,
                title: "One-Click LinkedIn Upload",
                description: "Publish your carousel directly to LinkedIn without leaving the app"
              },
              {
                icon: Save,
                title: "Draft Saving",
                description: "Save your work in progress and come back to finish it anytime"
              }
            ].map((feature, index) => (
              <Card 
                key={index} 
                className="group border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 bg-white"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0 group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
                      <feature.icon className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
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
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0A66C2]/10 mb-6">
              <Shield className="w-8 h-8 text-[#0A66C2]" />
            </div>
            
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Connect Your LinkedIn Account
            </h2>
            
            <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto leading-relaxed">
              Connect your LinkedIn account securely to publish carousels directly. 
              We use OAuth2 for secure authentication and never store your password.
            </p>
            
            <Button 
              onClick={handleLinkedInLogin}
              size="lg"
              className="gap-3 bg-[#0A66C2] hover:bg-[#004182] text-lg px-10 py-6"
              data-testid="button-connect-linkedin"
            >
              <SiLinkedin className="w-6 h-6" />
              Sign in with LinkedIn
            </Button>
            
            <p className="mt-4 text-sm text-slate-500">
              Your data is encrypted and protected
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-slate-900 text-slate-400">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-medium">LinkedIn Carousel Maker</span>
            </div>
            
            <nav className="flex items-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </nav>
            
            <p className="text-sm">
              &copy; {new Date().getFullYear()} LinkedIn Carousel Maker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
