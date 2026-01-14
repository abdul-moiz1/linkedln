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

  const categories = ["Basic", "Professional", "Creative"];

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates?.filter(t => t.category === category).map((template) => {
        const config = JSON.parse(template.config);
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
              {template.isNew && (
                <Badge className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600">New</Badge>
              )}
              <h3 
                className="text-2xl font-bold text-center leading-tight"
                style={{ color: config.textColor }}
              >
                {template.name}
              </h3>
            </div>
            <CardContent className="p-4 bg-card">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="text-sm line-clamp-1">{template.description}</CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        {step === "template-select" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                  <Badge variant="outline" className="px-4 py-1 cursor-pointer hover:bg-muted transition-colors">
                    Text to Carousel
                  </Badge>
                </div>
              </div>

              {categories.map(cat => (
                <TabsContent key={cat} value={cat} className="mt-0">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold">{cat}</h2>
                    <p className="text-muted-foreground">
                      {cat === "Basic" ? "For those who want to get started quickly." : 
                       cat === "Professional" ? "Sleek, corporate designs for B2B authority." : 
                       "Bold, unique layouts to stand out in the feed."}
                    </p>
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
