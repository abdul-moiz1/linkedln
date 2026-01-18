import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Wand2,
  Save,
  ArrowRight,
  Check
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import type { SessionUser, CarouselTemplate } from "@shared/schema";

type CreatorStep = "template-select" | "input" | "processing" | "images";
type AIProvider = "gemini" | "openai" | "stability" | "";

interface SlideMessage {
  id: number;
  text: string;
}

interface ProcessedSlide {
  number: number;
  rawText: string;
  finalText: string;
  imagePrompt: string;
  layout: string;
  charCount?: number;
  isHook?: boolean;
  isCta?: boolean;
  base64Image?: string;
  imageUrl?: string;
}

export default function Create() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<CreatorStep>("template-select");
  const [selectedCarouselType, setSelectedCarouselType] = useState<string>("");
  const [, setAiProvider] = useState<AIProvider>("gemini");
  const [carouselTitle, setCarouselTitle] = useState("");
  const [slides, setSlides] = useState<SlideMessage[]>([
    { id: 1, text: "" },
    { id: 2, text: "" },
    { id: 3, text: "" },
  ]);
  const [, setProcessedSlides] = useState<ProcessedSlide[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: user } = useQuery<SessionUser>({ queryKey: ["/api/user"] });

  const { data: templates, isLoading: templatesLoading } = useQuery<CarouselTemplate[]>({
    queryKey: ["/api/templates"],
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const [activeTab, setActiveTab] = useState("Basic");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const categories = ["Basic", "Professional", "Creative", "Elite"];

  const initials = user?.profile?.name
    ? user.profile.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "U";

  const [brandKit, setBrandKit] = useState({
    name: user?.profile?.name || "User",
    handle: "@" + (user?.profile?.name || "user").toLowerCase().replace(/\s+/g, ""),
    profilePic: user?.profile?.picture || ""
  });

  useEffect(() => {
    if (user?.profile) {
      setBrandKit({
        name: user.profile.name,
        handle: "@" + user.profile.name.toLowerCase().replace(/\s+/g, ""),
        profilePic: user.profile.picture || ""
      });
    }
  }, [user]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleProcessText = async () => {
    const rawTexts = slides.map(s => s.text.trim()).filter(t => t.length > 0);
    if (rawTexts.length < 2) {
      toast({
        title: "Missing content",
        description: "Please fill in at least 2 slides.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiRequest("POST", "/api/carousel/process", {
        rawTexts,
        carouselType: selectedCarouselType || "tips-howto",
        title: carouselTitle || "My Carousel",
      });
      const data = await response.json();
      setProcessedSlides(data.slides);
      setStep("images");
      toast({
        title: "Carousel Structured",
        description: "Your content has been prepared for image generation.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectTemplate = (template: CarouselTemplate) => {
    const config = JSON.parse(template.designSchema);
    setSelectedTemplateId(template.id);
    setSelectedCarouselType(config.layout || "tips-howto");
    setStep("input");
  };

  const TemplateGrid = ({ category }: { category: string }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates?.filter(t => t.category === category).map((template) => {
        const config = JSON.parse(template.designSchema);
        return (
          <Card 
            key={template.id} 
            className={`group cursor-pointer hover-elevate transition-all border-2 overflow-hidden ${selectedTemplateId === template.id ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
            onClick={() => handleSelectTemplate(template)}
          >
            <div 
              className="aspect-[4/5] w-full flex items-center justify-center p-8 relative"
              style={{ backgroundColor: config.backgroundColor }}
            >
              <h3 
                className="text-2xl font-bold text-center leading-tight"
                style={{ color: config.textColor }}
              >
                {template.name}
              </h3>
            </div>
            <CardContent className="p-4 bg-card">
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />
      
      <main className="w-full h-[calc(100vh-64px)] overflow-hidden">
        {step === "template-select" && (
          <div className="max-w-7xl mx-auto px-4 py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto h-full pb-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h1 className="text-4xl font-bold mb-4">Choose a Template</h1>
              <p className="text-muted-foreground text-lg">
                Select a high-performing design to start your LinkedIn carousel.
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-8 border-b pb-4">
                <TabsList className="bg-muted/50 p-1">
                  {categories.map(cat => (
                    <TabsTrigger key={cat} value={cat} className="px-8">{cat}</TabsTrigger>
                  ))}
                </TabsList>
                
                <div className="flex gap-4">
                  <Badge variant="outline" className="px-4 py-1 cursor-pointer hover:bg-muted transition-colors">
                    Templates
                  </Badge>
                  <Badge variant="outline" className="px-4 py-1 cursor-pointer hover:bg-muted transition-colors">
                    Saved <span className="ml-1 bg-blue-500 text-white px-1.5 rounded-full text-[10px]">0</span>
                  </Badge>
                </div>
              </div>

              {categories.map(cat => (
                <TabsContent key={cat} value={cat} className="mt-0">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold">{cat}</h2>
                  </div>
                  {templatesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1,2,3].map(i => <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-lg" />)}
                    </div>
                  ) : (
                    <TemplateGrid category={cat} />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        {step === "input" && (
          <div className="flex h-full animate-in fade-in duration-500">
            {/* Left Sidebar: Brand Kit */}
            <div className="w-80 border-r bg-white p-6 space-y-8 overflow-y-auto">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Brand Kit</h3>
                <Card className="border-dashed bg-slate-50/50 p-6 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full border flex items-center justify-center">
                    <Plus className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">No brand kit found</p>
                    <Button variant="outline" size="sm" className="bg-[#00a0dc] text-white hover:bg-[#008dbf] border-none rounded-full h-8 px-4">
                      + Create Brand Kit
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Your Name</Label>
                  <Input 
                    value={brandKit.name} 
                    onChange={e => setBrandKit({...brandKit, name: e.target.value})}
                    className="h-10 bg-[#F8F9FB] border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Profile Pic</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border">
                      {brandKit.profilePic ? (
                        <img src={brandKit.profilePic} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">{initials}</div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Handle</Label>
                  <Input 
                    value={brandKit.handle} 
                    onChange={e => setBrandKit({...brandKit, handle: e.target.value})}
                    className="h-10 bg-[#F8F9FB] border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Center: Slide Editor */}
            <div className="flex-1 bg-[#F8F9FB] p-8 overflow-y-auto flex flex-col">
              <div className="max-w-3xl mx-auto w-full space-y-6">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-4">
                     <Button variant="ghost" size="icon" className="bg-white border rounded-full" onClick={() => setStep("template-select")}>
                       <ChevronLeft className="w-4 h-4" />
                     </Button>
                     <div>
                       <h2 className="font-bold text-slate-900">Basic #22</h2>
                       <p className="text-xs text-slate-500">Last saved on {new Date().toLocaleDateString()}, {new Date().toLocaleTimeString()}</p>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <Button variant="outline" className="rounded-full px-6 font-bold h-9">Save</Button>
                     <Button onClick={handleProcessText} className="rounded-full px-8 bg-[#00a0dc] hover:bg-[#008dbf] font-bold h-9">Continue</Button>
                   </div>
                </div>

                <Card className="bg-white border-none shadow-sm rounded-xl overflow-hidden p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">SLIDE {currentSlideIndex + 1}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => {
                        const newSlide = { id: Date.now(), text: "" };
                        const newSlides = [...slides];
                        newSlides.splice(currentSlideIndex + 1, 0, newSlide);
                        setSlides(newSlides);
                        setCurrentSlideIndex(currentSlideIndex + 1);
                      }}><Plus className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><Save className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => {
                        if (slides.length > 1) {
                          const newSlides = slides.filter((_, i) => i !== currentSlideIndex);
                          setSlides(newSlides);
                          setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
                        }
                      }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500">Title</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="The Title of Your Visual Post Here" 
                          value={slides[currentSlideIndex]?.text || ""}
                          onChange={(e) => {
                            const newSlides = [...slides];
                            newSlides[currentSlideIndex].text = e.target.value;
                            setSlides(newSlides);
                          }}
                          className="h-12 border-slate-200 rounded-xl"
                        />
                        <Button variant="ghost" size="icon" className="h-12 w-12 border rounded-xl"><Wand2 className="w-4 h-4 text-slate-400" /></Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500">Description</Label>
                      <div className="flex gap-2">
                        <Textarea 
                          placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit..." 
                          className="min-h-[160px] border-slate-200 rounded-xl resize-none"
                        />
                        <Button variant="ghost" size="icon" className="h-12 w-12 border rounded-xl mt-0"><Wand2 className="w-4 h-4 text-slate-400" /></Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-center gap-6 pt-4">
                  <Button 
                    variant="ghost" size="icon" className="bg-white border rounded-full h-10 w-10 shadow-sm"
                    disabled={currentSlideIndex === 0}
                    onClick={() => setCurrentSlideIndex(prev => prev - 1)}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <span className="text-sm font-bold text-slate-600">Slides {currentSlideIndex + 1} / {slides.length}</span>
                  <Button 
                    variant="ghost" size="icon" className="bg-white border rounded-full h-10 w-10 shadow-sm"
                    disabled={currentSlideIndex === slides.length - 1}
                    onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: Live Preview */}
            <div className="w-[450px] border-l bg-white flex flex-col items-center justify-center p-8 overflow-y-auto">
               <div className="w-full aspect-[4/5] bg-[#1a0b45] rounded-lg relative overflow-hidden flex flex-col p-12 text-white shadow-2xl">
                 <div className="flex flex-col gap-6 flex-1">
                   <span className="text-lg font-medium text-slate-300">{brandKit.handle}</span>
                   <h2 className="text-4xl font-bold leading-tight mt-4">
                     {slides[currentSlideIndex]?.text || "The Title Of Your Visual Post Here"}
                   </h2>
                   <p className="text-lg text-slate-300 leading-relaxed">
                     Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                   </p>
                 </div>

                 <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                      <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                        {brandKit.profilePic ? (
                          <img src={brandKit.profilePic} alt="PFP" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-blue-500 flex items-center justify-center font-bold text-xs">{initials}</div>
                        )}
                      </div>
                      <span className="font-bold text-sm">{brandKit.name || "Jon Snow"}</span>
                    </div>
                    <div className="w-16 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                      <ChevronRight className="w-6 h-6 text-white" />
                    </div>
                 </div>
                 
                 <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-blue-500/20 blur-[100px] rounded-full" />
               </div>
            </div>
          </div>
        )}

        {step === "images" && (
          <div className="max-w-2xl mx-auto text-center py-20 space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold">Content Structured!</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Your carousel content has been prepared. Now you can preview and post to LinkedIn.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" size="lg" onClick={() => setStep("input")}>Edit Content</Button>
              <Button size="lg" onClick={() => navigate("/preview")}>
                Preview & Post <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
