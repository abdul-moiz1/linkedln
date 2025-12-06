import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowRight,
  Check,
  FileText,
  Palette,
  ImageIcon,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { setCarouselData } from "@/lib/carouselStore";
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
  charCount?: number;
  tooMuchText?: boolean;
  maxChars?: number;
  isHook?: boolean;
  isCta?: boolean;
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

const STEPS = [
  { id: "type-select", label: "Setup", icon: FileText },
  { id: "input", label: "Content", icon: Palette },
  { id: "processing", label: "Refine", icon: Wand2 },
  { id: "images", label: "Preview", icon: ImageIcon },
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

  const { data: user, isLoading: isLoadingUser } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoadingUser && !user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to create and save your carousels.",
      });
      navigate("/login");
    }
  }, [user, isLoadingUser, navigate, toast]);

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
    try {
      // Normalize slides before saving - trim text
      const normalizedSlidesForSave = slides.map(s => ({
        ...s,
        text: s.text.trim()
      }));
      
      const slidesWithoutImages = processedSlides.map(slide => ({
        ...slide,
        base64Image: undefined,
      }));
      
      const draft: CarouselDraft = {
        title: carouselTitle,
        carouselType: selectedCarouselType,
        aiProvider,
        slides: normalizedSlidesForSave,
        processedSlides: slidesWithoutImages,
        step,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      toast({
        title: "Draft Saved",
        description: "Your carousel has been saved locally.",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        toast({
          title: "Storage Full",
          description: "Unable to save draft. Please clear some browser storage.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Save Failed",
          description: "Could not save your draft. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const loadDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft: CarouselDraft = JSON.parse(savedDraft);
        setCarouselTitle(draft.title);
        setSelectedCarouselType(draft.carouselType);
        setAiProvider(draft.aiProvider);
        
        // Normalize slides on load - trim text
        const normalizedSlides = draft.slides.map(s => ({
          ...s,
          text: s.text.trim()
        }));
        setSlides(normalizedSlides);
        
        // Check if any slide exceeds character limits
        const hasExcessiveTextInDraft = normalizedSlides.some((slide, index) => {
          const isHook = index === 0;
          const maxChars = isHook ? 50 : 100;
          return slide.text.length > maxChars;
        });
        
        // If any slide exceeds limits, force back to input step
        if (hasExcessiveTextInDraft) {
          setProcessedSlides([]);
          setStep("input");
          setHasDraft(false);
          toast({
            title: "Draft Updated",
            description: "Some slides exceed character limits. Please review and shorten them.",
          });
          return;
        }
        
        // Normalize processedSlides as well - clamp finalText to limits
        const normalizedProcessedSlides = draft.processedSlides.map((slide, index) => {
          const isFirstSlide = index === 0;
          const isLastSlide = index === draft.processedSlides.length - 1;
          const maxChars = isFirstSlide ? 50 : 100;
          
          let finalText = (slide.finalText || "").trim();
          // Clamp to maxChars - ensure length never exceeds limit
          if (finalText.length > maxChars) {
            // Reserve 3 chars for ellipsis
            const truncateAt = maxChars - 3;
            const truncated = finalText.substring(0, truncateAt);
            const lastSpace = truncated.lastIndexOf(" ");
            // Try to break at word boundary, otherwise just truncate
            finalText = (lastSpace > truncateAt * 0.7 ? truncated.substring(0, lastSpace) : truncated) + "...";
          }
          
          return {
            ...slide,
            finalText,
            charCount: finalText.length,
            maxChars,
            tooMuchText: false, // Always false after clamping
            isHook: isFirstSlide,
            isCta: isLastSlide,
          };
        });
        
        setProcessedSlides(normalizedProcessedSlides);
        setHasDraft(false);
        
        const hasImages = normalizedProcessedSlides.some(slide => slide.base64Image);
        if (draft.step === "images" && !hasImages) {
          setStep("processing");
          toast({
            title: "Draft Restored",
            description: "Your text has been loaded. Please regenerate images.",
          });
        } else {
          setStep(draft.step);
          toast({
            title: "Draft Restored",
            description: "Your previous work has been loaded.",
          });
        }
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
      // Normalize: trim all text before sending to server
      const rawTexts = slides
        .map(s => s.text.trim())
        .filter(t => t.length > 0);
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
          title: "Images Generated",
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
    // Remove excessive whitespace (leading/trailing and multiple consecutive)
    // but allow single newlines for readability during editing
    setSlides(slides.map(s => s.id === id ? { ...s, text } : s));
  };
  
  // Normalize slides before processing - trim all text
  const getNormalizedSlides = () => {
    return slides.map(s => ({ ...s, text: s.text.trim() }));
  };

  const handlePreview = () => {
    setCarouselData({
      title: carouselTitle,
      carouselType: selectedCarouselType,
      aiProvider,
      slides,
      processedSlides,
      step,
      savedAt: Date.now(),
    });
    saveDraft();
    navigate("/preview");
  };

  const getProviderName = (provider: AIProvider) => {
    switch (provider) {
      case "gemini": return "Gemini";
      case "openai": return "DALL-E";
      case "stability": return "Stability";
      default: return "Auto";
    }
  };

  const getTypeName = (typeId: string) => {
    return DEFAULT_CAROUSEL_TYPES.find(t => t.id === typeId)?.name || typeId;
  };

  const filledSlides = slides.filter(s => s.text.trim()).length;
  const typeInfo = DEFAULT_CAROUSEL_TYPES.find(t => t.id === selectedCarouselType);
  const currentStepIndex = STEPS.findIndex(s => s.id === step);
  
  // Check if any slide exceeds character limits (normalize by trimming whitespace)
  const hasExcessiveText = slides.some((slide, index) => {
    const isHook = index === 0;
    const maxChars = isHook ? 50 : 100;
    const normalizedLength = slide.text.trim().length;
    return normalizedLength > maxChars;
  });
  const canProcess = filledSlides >= 2 && !hasExcessiveText;

  return (
    <div className="min-h-screen bg-background">
      <Header variant="app" />
      
      <main className="container mx-auto max-w-3xl py-12 px-4">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {STEPS.map((s, index) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isCompleted = index < currentStepIndex;
              
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : isCompleted
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 mt-[-1rem] ${
                      index < currentStepIndex ? "bg-primary/30" : "bg-muted"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Draft Banner */}
        {hasDraft && step === "type-select" && (
          <div className="mb-8 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Continue your draft?</p>
                <p className="text-sm text-muted-foreground">Pick up where you left off</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={clearDraft} data-testid="button-discard-draft">
                  Start Fresh
                </Button>
                <Button size="sm" onClick={loadDraft} data-testid="button-load-draft">
                  Load Draft
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Setup */}
        {step === "type-select" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Create Carousel</h1>
              <p className="text-muted-foreground">Set up your carousel preferences</p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                  <Input
                    id="title"
                    placeholder="Give your carousel a name..."
                    value={carouselTitle}
                    onChange={(e) => setCarouselTitle(e.target.value)}
                    className="h-11"
                    data-testid="input-carousel-title"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Type</Label>
                    <Select value={selectedCarouselType} onValueChange={setSelectedCarouselType}>
                      <SelectTrigger className="h-11" data-testid="select-carousel-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_CAROUSEL_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCarouselType && (
                      <p className="text-xs text-muted-foreground">
                        {DEFAULT_CAROUSEL_TYPES.find(t => t.id === selectedCarouselType)?.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">AI Provider</Label>
                    <Select value={aiProvider} onValueChange={(v) => setAiProvider(v as AIProvider)}>
                      <SelectTrigger className="h-11" data-testid="select-ai-provider">
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

                <div className="pt-4">
                  <Button
                    className="w-full h-11"
                    onClick={() => setStep("input")}
                    disabled={!selectedCarouselType}
                    data-testid="button-next-step"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Content */}
        {step === "input" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Write Content</h1>
                <p className="text-muted-foreground mt-1">Enter the text for each slide</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="font-normal">{getTypeName(selectedCarouselType)}</Badge>
                <Badge variant="outline" className="font-normal">{getProviderName(aiProvider)}</Badge>
              </div>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                {slides.map((slide, index) => {
                  const isHook = index === 0;
                  const isCta = index === slides.length - 1;
                  const maxChars = isHook ? 50 : 100;
                  const charCount = slide.text.trim().length;
                  const tooMuchText = charCount > maxChars;
                  
                  return (
                    <div key={slide.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium text-muted-foreground">
                            Slide {index + 1}
                          </Label>
                          {isHook && (
                            <Badge variant="default" className="text-xs">Hook</Badge>
                          )}
                          {isCta && (
                            <Badge variant="secondary" className="text-xs">CTA</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${tooMuchText ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {charCount}/{maxChars}
                          </span>
                          {slides.length > 2 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSlide(slide.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              data-testid={`button-remove-slide-${index}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <Textarea
                        placeholder={
                          isHook 
                            ? "Write a short, powerful hook to grab attention..." 
                            : isCta 
                              ? "End with a call-to-action (e.g., Follow for more)" 
                              : `What would you like to say on slide ${index + 1}?`
                        }
                        value={slide.text}
                        onChange={(e) => updateSlide(slide.id, e.target.value)}
                        rows={3}
                        className={`resize-none ${tooMuchText ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        data-testid={`textarea-slide-${index}`}
                      />
                      {tooMuchText && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          Too much text - keep it short for better readability
                        </p>
                      )}
                      {isHook && charCount === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Tip: "The #1 mistake...", "Stop doing this...", "Here's what nobody tells you..."
                        </p>
                      )}
                    </div>
                  );
                })}

                {typeInfo && slides.length < typeInfo.slideCount.max && (
                  <Button 
                    variant="outline" 
                    onClick={addSlide} 
                    className="w-full h-11 border-dashed" 
                    data-testid="button-add-slide"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Slide
                  </Button>
                )}

                {hasExcessiveText && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                    Some slides exceed character limits. Please shorten them to proceed.
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setStep("type-select")}
                    data-testid="button-back-to-setup"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={saveDraft} data-testid="button-save-draft">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={() => processTextMutation.mutate()}
                      disabled={!canProcess || processTextMutation.isPending}
                      data-testid="button-process-text"
                    >
                      {processTextMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      Process
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Refine */}
        {step === "processing" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Review Content</h1>
              <p className="text-muted-foreground mt-1">AI-refined slides ready for image generation</p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                {processedSlides.map((slide, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border ${slide.tooMuchText ? 'bg-destructive/5 border-destructive/30' : 'bg-muted/30 border-border/50'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        {slide.isHook && (
                          <Badge variant="default" className="text-xs">Hook</Badge>
                        )}
                        {slide.isCta && (
                          <Badge variant="secondary" className="text-xs">CTA</Badge>
                        )}
                        <Badge variant="outline" className="text-xs font-normal">{slide.layout}</Badge>
                      </div>
                      <span className={`text-xs ${slide.tooMuchText ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {slide.charCount || slide.finalText.length}/{slide.maxChars || 100} chars
                      </span>
                    </div>
                    <p className={`leading-relaxed ${slide.isHook ? 'text-lg font-bold' : 'text-foreground font-medium'}`}>
                      {slide.finalText}
                    </p>
                    {slide.tooMuchText && (
                      <p className="text-xs text-destructive mt-2">
                        Text may be too long for optimal readability
                      </p>
                    )}
                    {slide.imagePrompt && (
                      <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                        Image: {slide.imagePrompt}
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between pt-4 border-t gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setStep("input")}
                    data-testid="button-edit-text"
                  >
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
          </div>
        )}

        {/* Step 4: Preview */}
        {step === "images" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Preview</h1>
              <p className="text-muted-foreground mt-1">Review your carousel before posting</p>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {/* Main Image Display - LinkedIn 4:5 Aspect Ratio */}
                <div className="relative aspect-[4/5] bg-muted">
                  {/* Slide Number Indicator */}
                  <div className="absolute top-3 right-3 z-10 bg-black/60 text-white px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                    {currentImageIndex + 1} / {processedSlides.length}
                  </div>
                  
                  {/* Slide Type Badge */}
                  {processedSlides[currentImageIndex]?.isHook && (
                    <div className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-medium">
                      Hook Slide
                    </div>
                  )}
                  {processedSlides[currentImageIndex]?.isCta && (
                    <div className="absolute top-3 left-3 z-10 bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full text-xs font-medium">
                      CTA Slide
                    </div>
                  )}

                  {processedSlides[currentImageIndex]?.base64Image ? (
                    <img
                      src={processedSlides[currentImageIndex].base64Image}
                      alt={`Slide ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  
                  {/* Image Navigation Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                    <div className="flex items-center justify-center gap-2">
                      {processedSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentImageIndex 
                              ? "bg-white w-4" 
                              : "bg-white/50"
                          }`}
                          data-testid={`button-dot-${idx}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Arrow Navigation */}
                  {currentImageIndex > 0 && (
                    <button
                      onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md"
                      data-testid="button-prev-image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {currentImageIndex < processedSlides.length - 1 && (
                    <button
                      onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md"
                      data-testid="button-next-image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Thumbnails */}
                <div className="p-4 border-t bg-muted/30">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {processedSlides.map((slide, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden transition-all ${
                          idx === currentImageIndex 
                            ? "ring-2 ring-primary ring-offset-2" 
                            : "opacity-60 hover:opacity-100"
                        }`}
                        data-testid={`button-thumbnail-${idx}`}
                      >
                        {slide.base64Image ? (
                          <img 
                            src={slide.base64Image} 
                            alt={`Thumbnail ${idx + 1}`} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t flex items-center justify-between gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setStep("processing")}
                    data-testid="button-back-to-refine"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={saveDraft} data-testid="button-save-progress">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handlePreview} data-testid="button-preview">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview & Post
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
