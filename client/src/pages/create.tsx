import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  RotateCcw,
  Eye,
  Save,
  ArrowLeft,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import type { SessionUser } from "@shared/schema";

const DRAFT_STORAGE_KEY = "carousel_draft";

type CreatorStep = "type-select" | "input" | "processing" | "images";
type AIProvider = "auto" | "gemini" | "openai" | "stability";

interface CarouselTypeInfo {
  id: string;
  name: string;
  description: string;
  slideCount: { min: number; max: number };
}

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
  base64Image?: string;
}

interface CarouselDraft {
  title: string;
  carouselType: string;
  aiProvider: AIProvider;
  slides: SlideMessage[];
  processedSlides: ProcessedSlide[];
  step: CreatorStep;
  savedAt: number;
}

const DEFAULT_CAROUSEL_TYPES: CarouselTypeInfo[] = [
  { id: "story-flow", name: "Story-Flow", description: "Tell a narrative across slides", slideCount: { min: 3, max: 5 } },
  { id: "educational", name: "Educational", description: "Teach concepts step by step", slideCount: { min: 3, max: 5 } },
  { id: "before-after", name: "Before/After", description: "Show transformation or comparison", slideCount: { min: 2, max: 4 } },
  { id: "checklist", name: "Checklist", description: "Present actionable items", slideCount: { min: 3, max: 5 } },
  { id: "quote", name: "Quote", description: "Feature impactful quotes", slideCount: { min: 2, max: 4 } },
  { id: "stats-data", name: "Stats/Data", description: "Present key statistics", slideCount: { min: 3, max: 5 } },
  { id: "portfolio", name: "Portfolio", description: "Showcase work examples", slideCount: { min: 3, max: 5 } },
  { id: "comparison", name: "Comparison", description: "Compare options or choices", slideCount: { min: 2, max: 4 } },
  { id: "achievement", name: "Achievement", description: "Highlight accomplishments", slideCount: { min: 2, max: 5 } },
  { id: "framework", name: "Framework", description: "Present a methodology or process", slideCount: { min: 3, max: 5 } },
];

export default function Create() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<CreatorStep>("type-select");
  const [selectedCarouselType, setSelectedCarouselType] = useState<string>("");
  const [aiProvider, setAiProvider] = useState<AIProvider>("auto");
  const [carouselTitle, setCarouselTitle] = useState("");
  const [slides, setSlides] = useState<SlideMessage[]>([
    { id: 1, text: "" },
    { id: 2, text: "" },
    { id: 3, text: "" },
  ]);
  const [processedSlides, setProcessedSlides] = useState<ProcessedSlide[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);

  const { data: user } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
  });

  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft: CarouselDraft = JSON.parse(savedDraft);
        const hoursSinceSave = (Date.now() - draft.savedAt) / (1000 * 60 * 60);
        if (hoursSinceSave < 24) {
          setHasDraft(true);
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }, []);

  const saveDraft = () => {
    const draft: CarouselDraft = {
      title: carouselTitle,
      carouselType: selectedCarouselType,
      aiProvider,
      slides,
      processedSlides,
      step,
      savedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    toast({
      title: "Draft Saved",
      description: "Your carousel has been saved locally",
    });
  };

  const loadDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft: CarouselDraft = JSON.parse(savedDraft);
        setCarouselTitle(draft.title);
        setSelectedCarouselType(draft.carouselType);
        setAiProvider(draft.aiProvider);
        setSlides(draft.slides);
        setProcessedSlides(draft.processedSlides);
        setStep(draft.step);
        setHasDraft(false);
        toast({
          title: "Draft Restored",
          description: "Your previous work has been loaded",
        });
      } catch {
        toast({
          title: "Error",
          description: "Could not load draft",
          variant: "destructive",
        });
      }
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
  };

  const processTextMutation = useMutation({
    mutationFn: async () => {
      const rawTexts = slides.map(s => s.text).filter(t => t.trim());
      const response = await apiRequest("POST", "/api/carousel/process", {
        rawTexts,
        carouselType: selectedCarouselType,
        title: carouselTitle,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.slides) {
        setProcessedSlides(data.slides);
        setStep("processing");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process text",
        variant: "destructive",
      });
    },
  });

  const generateImagesMutation = useMutation({
    mutationFn: async () => {
      const messages = processedSlides.map(s => s.imagePrompt || s.finalText);
      const response = await apiRequest("POST", "/api/images/generate", {
        messages,
        provider: aiProvider,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.imageUrls && data.imageUrls.length > 0) {
        const updatedSlides = processedSlides.map((slide, idx) => ({
          ...slide,
          base64Image: data.imageUrls[idx] || undefined,
        }));
        setProcessedSlides(updatedSlides);
        setCurrentImageIndex(0);
        setStep("images");
        saveDraft();
        toast({
          title: "Images Generated!",
          description: `Created ${data.imageUrls.length} images`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate images",
        variant: "destructive",
      });
    },
  });

  const addSlide = () => {
    const typeInfo = DEFAULT_CAROUSEL_TYPES.find(t => t.id === selectedCarouselType);
    const maxSlides = typeInfo?.slideCount.max || 5;
    if (slides.length < maxSlides) {
      setSlides([...slides, { id: Date.now(), text: "" }]);
    }
  };

  const removeSlide = (id: number) => {
    if (slides.length > 2) {
      setSlides(slides.filter(s => s.id !== id));
    }
  };

  const updateSlide = (id: number, text: string) => {
    setSlides(slides.map(s => s.id === id ? { ...s, text } : s));
  };

  const handlePreview = () => {
    saveDraft();
    navigate("/preview");
  };

  const getProviderName = (provider: AIProvider) => {
    switch (provider) {
      case "gemini": return "Gemini";
      case "openai": return "OpenAI DALL-E";
      case "stability": return "Stability AI";
      default: return "Auto";
    }
  };

  const getTypeName = (typeId: string) => {
    return DEFAULT_CAROUSEL_TYPES.find(t => t.id === typeId)?.name || typeId;
  };

  const filledSlides = slides.filter(s => s.text.trim()).length;
  const typeInfo = DEFAULT_CAROUSEL_TYPES.find(t => t.id === selectedCarouselType);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header variant="app" />
      
      <main className="container mx-auto max-w-4xl py-8 px-4">
        {hasDraft && step === "type-select" && (
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">You have a saved draft</p>
                  <p className="text-sm text-slate-600">Would you like to continue where you left off?</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearDraft} data-testid="button-discard-draft">
                    Start Fresh
                  </Button>
                  <Button size="sm" onClick={loadDraft} data-testid="button-load-draft">
                    Load Draft
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "type-select" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create New Carousel</CardTitle>
              <CardDescription>
                Choose your carousel type and AI provider to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Carousel Title</Label>
                <Input
                  id="title"
                  placeholder="My awesome carousel"
                  value={carouselTitle}
                  onChange={(e) => setCarouselTitle(e.target.value)}
                  data-testid="input-carousel-title"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Carousel Type</Label>
                  <Select value={selectedCarouselType} onValueChange={setSelectedCarouselType}>
                    <SelectTrigger data-testid="select-carousel-type">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_CAROUSEL_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex flex-col">
                            <span>{type.name}</span>
                            <span className="text-xs text-muted-foreground">{type.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>AI Image Provider</Label>
                  <Select value={aiProvider} onValueChange={(v) => setAiProvider(v as AIProvider)}>
                    <SelectTrigger data-testid="select-ai-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Best Available)</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="openai">OpenAI DALL-E</SelectItem>
                      <SelectItem value="stability">Stability AI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep("input")}
                  disabled={!selectedCarouselType}
                  data-testid="button-next-step"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "input" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("type-select")}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <CardTitle>Write Your Slides</CardTitle>
                  <CardDescription>
                    Enter the text for each slide of your carousel
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">{getTypeName(selectedCarouselType)}</Badge>
                <Badge variant="outline">{getProviderName(aiProvider)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {slides.map((slide, index) => (
                <div key={slide.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Slide {index + 1}</Label>
                    {slides.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSlide(slide.id)}
                        data-testid={`button-remove-slide-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    placeholder={`Enter text for slide ${index + 1}...`}
                    value={slide.text}
                    onChange={(e) => updateSlide(slide.id, e.target.value)}
                    rows={3}
                    data-testid={`textarea-slide-${index}`}
                  />
                </div>
              ))}

              {typeInfo && slides.length < typeInfo.slideCount.max && (
                <Button variant="outline" onClick={addSlide} className="w-full" data-testid="button-add-slide">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Slide
                </Button>
              )}

              <div className="flex flex-wrap justify-between gap-4 pt-4 border-t">
                <Button variant="outline" onClick={saveDraft} data-testid="button-save-draft">
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button
                  onClick={() => processTextMutation.mutate()}
                  disabled={filledSlides < 2 || processTextMutation.isPending}
                  data-testid="button-process-text"
                >
                  {processTextMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Process Text
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "processing" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("input")}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <CardTitle>AI-Refined Slides</CardTitle>
                  <CardDescription>
                    Review and generate images for your slides
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {processedSlides.map((slide, index) => (
                <div key={index} className="p-4 rounded-lg border bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-600">{index + 1}</Badge>
                    <Badge variant="outline">{slide.layout}</Badge>
                  </div>
                  <p className="font-medium text-slate-900">{slide.finalText}</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Image: {slide.imagePrompt?.substring(0, 100)}...
                  </p>
                </div>
              ))}

              <div className="flex flex-wrap justify-between gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep("input")} data-testid="button-edit-text">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Edit Text
                </Button>
                <Button
                  onClick={() => generateImagesMutation.mutate()}
                  disabled={generateImagesMutation.isPending}
                  data-testid="button-generate-images"
                >
                  {generateImagesMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Images
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "images" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("processing")}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <CardTitle>Generated Images</CardTitle>
                  <CardDescription>
                    Preview your carousel images before posting
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative aspect-square max-w-md mx-auto bg-slate-100 rounded-lg overflow-hidden">
                {processedSlides[currentImageIndex]?.base64Image ? (
                  <img
                    src={processedSlides[currentImageIndex].base64Image}
                    alt={`Slide ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    No image
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                  disabled={currentImageIndex === 0}
                  data-testid="button-prev-image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600">
                  {currentImageIndex + 1} / {processedSlides.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentImageIndex(Math.min(processedSlides.length - 1, currentImageIndex + 1))}
                  disabled={currentImageIndex === processedSlides.length - 1}
                  data-testid="button-next-image"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto py-2">
                {processedSlides.map((slide, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex ? "border-blue-600 ring-2 ring-blue-200" : "border-transparent"
                    }`}
                    data-testid={`button-thumbnail-${idx}`}
                  >
                    {slide.base64Image ? (
                      <img src={slide.base64Image} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap justify-between gap-4 pt-4 border-t">
                <Button variant="outline" onClick={saveDraft} data-testid="button-save-progress">
                  <Save className="w-4 h-4 mr-2" />
                  Save Progress
                </Button>
                <Button onClick={handlePreview} data-testid="button-preview">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview & Post
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
