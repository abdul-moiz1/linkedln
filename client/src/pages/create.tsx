import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Wand2,
  RotateCcw,
  Eye,
  Save,
  ArrowRight,
  Check,
  FileText,
  Palette,
  ImageIcon,
  Link as LinkIcon,
  PenTool,
  Globe,
  Download,
  Mic,
  Square,
  RefreshCcw,
  Info
} from "lucide-react";
import { SiLinkedin } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { setCarouselData } from "@/lib/carouselStore";
import Header from "@/components/Header";
import type { SessionUser, CarouselTemplate } from "@shared/schema";

const DRAFT_STORAGE_KEY = "carousel_draft";

type WorkspaceView = "dashboard" | "manual" | "url-input" | "url-processing" | "voice-input" | "voice-processing" | "editor";
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
  const [aiProvider, setAiProvider] = useState<AIProvider>("gemini");
  const [carouselTitle, setCarouselTitle] = useState("");
  const [slides, setSlides] = useState<SlideMessage[]>([
    { id: 1, text: "" },
    { id: 2, text: "" },
    { id: 3, text: "" },
  ]);
  const [processedSlides, setProcessedSlides] = useState<ProcessedSlide[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: templates, isLoading: templatesLoading } = useQuery<CarouselTemplate[]>({
    queryKey: ["/api/templates"],
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const [activeTab, setActiveTab] = useState("Basic");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const categories = ["Basic", "Professional", "Creative", "Elite"];

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
    const config = JSON.parse(template.config);
    setSelectedTemplateId(template.id);
    setSelectedCarouselType(config.layout || "tips-howto");
    setStep("input");
  };

  const TemplateGrid = ({ category }: { category: string }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {templates?.filter(t => t.category === category).map((template) => {
        const config = JSON.parse(template.config);
        return (
          <div 
            key={template.id} 
            className="group cursor-pointer flex flex-col gap-4"
            onClick={() => handleSelectTemplate(template)}
          >
            <div 
              className={`aspect-[4/5] w-full rounded-[2rem] flex items-center justify-center p-8 relative transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-xl ${selectedTemplateId === template.id ? 'ring-4 ring-blue-500 ring-offset-4' : ''}`}
              style={{ 
                background: config.backgroundGradient || config.backgroundColor,
                backgroundColor: config.backgroundColor 
              }}
            >
              <div className="absolute top-6 right-6">
                <Badge className="bg-white/90 backdrop-blur-sm text-slate-900 hover:bg-white border-none rounded-full px-3 py-1 text-[11px] font-bold shadow-sm">
                  {template.slideCount || 7} slides
                </Badge>
              </div>
              
              {template.isNew && (
                <Badge className="absolute top-6 left-6 bg-blue-500 hover:bg-blue-600 border-none rounded-full px-3 py-1 text-[11px] font-bold shadow-lg">New</Badge>
              )}

              <div className="w-full h-full flex items-center justify-center pointer-events-none opacity-90">
                {template.thumbnailUrl ? (
                  <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <h3 
                    className="text-2xl font-bold text-center leading-tight drop-shadow-sm"
                    style={{ color: config.textColor }}
                  >
                    {template.name}
                  </h3>
                )}
              </div>
            </div>
            <div className="px-2">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{template.name}</h3>
              <p className="text-sm font-medium text-slate-400">{template.category}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        {step === "template-select" && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold text-[#1a1a1a] tracking-tight">Carousel Templates</h1>
              <p className="text-slate-500 text-lg">Choose a professional template to get started.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
              {templatesLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="aspect-[4/5] bg-slate-100 animate-pulse rounded-xl" />
                ))
              ) : (
                templates?.map((template) => {
                  const config = JSON.parse(template.config);
                  return (
                    <Card 
                      key={template.id}
                      className="overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer bg-white rounded-xl"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="aspect-[4/5] relative overflow-hidden bg-slate-100">
                        <div className="absolute inset-0 transition-opacity duration-500">
                          {template.thumbnailUrl ? (
                            <img 
                              src={template.thumbnailUrl} 
                              alt={template.name} 
                              className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center p-8"
                              style={{ 
                                background: config.backgroundGradient || config.backgroundColor,
                                backgroundColor: config.backgroundColor 
                              }}
                            >
                              <h3 
                                className="text-2xl font-bold text-center leading-tight drop-shadow-sm"
                                style={{ color: config.textColor }}
                              >
                                {template.name}
                              </h3>
                            </div>
                          )}
                        </div>
                        
                        <div className="absolute top-3 right-3 z-10">
                          <Badge className="bg-white/90 hover:bg-white text-[#1a1a1a] border-none shadow-sm font-bold px-2 py-0.5 text-[10px] rounded-full">
                            {template.slideCount || 7} slides
                          </Badge>
                        </div>

                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Button variant="secondary" className="font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 rounded-full px-6">
                             Use Template
                           </Button>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-1">
                        <h3 className="font-bold text-[#1a1a1a] text-lg leading-tight group-hover:text-[#00a0dc] transition-colors">
                          {template.name}
                        </h3>
                        <p className="text-sm text-slate-400 font-medium">
                          {template.category}
                        </p>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {step === "input" && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <Button variant="ghost" className="mb-4" onClick={() => setStep("template-select")}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back to Templates
                </Button>
                <h1 className="text-3xl font-bold">Add Your Content</h1>
                <p className="text-muted-foreground">Fill in the text for each slide.</p>
              </div>
              <Button onClick={handleProcessText} size="lg" disabled={isProcessing} className="shadow-lg shadow-primary/20">
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Carousel Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g., 5 Tips for Better SEO" 
                  value={carouselTitle}
                  onChange={(e) => setCarouselTitle(e.target.value)}
                />
              </div>

              {slides.map((slide, idx) => (
                <Card key={slide.id} className="overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
                    <Label className="font-bold">Slide {idx + 1} {idx === 0 ? "(Hook)" : idx === slides.length - 1 ? "(CTA)" : ""}</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{slide.text.length}/{idx === 0 ? 50 : 100}</Badge>
                      {slides.length > 2 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setSlides(slides.filter(s => s.id !== slide.id))}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    className="border-none focus-visible:ring-0 min-h-[120px] resize-none text-lg p-4"
                    placeholder={idx === 0 ? "Write a scroll-stopping hook..." : "Add your slide content..."}
                    value={slide.text}
                    onChange={(e) => {
                      const newSlides = [...slides];
                      newSlides[idx].text = e.target.value;
                      setSlides(newSlides);
                    }}
                  />
                </Card>
              ))}
              
              <Button variant="outline" className="w-full border-dashed py-8" onClick={() => setSlides([...slides, { id: Date.now(), text: "" }])}>
                <Plus className="w-4 h-4 mr-2" /> Add Another Slide
              </Button>
            </div>
          </div>
        )}

        {step === "images" && (
          <div className="text-center py-20 space-y-6 animate-in fade-in zoom-in-95 duration-500">
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
