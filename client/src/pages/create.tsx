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
  Link as LinkIcon,
  PenTool,
  Globe,
  Download,
  Mic,
  Square,
  RefreshCcw,
} from "lucide-react";
import { SiLinkedin } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { setCarouselData } from "@/lib/carouselStore";
import Header from "@/components/Header";
import type { SessionUser } from "@shared/schema";

const DRAFT_STORAGE_KEY = "carousel_draft";

type WorkspaceView = "dashboard" | "manual" | "url-input" | "url-processing" | "voice-input" | "voice-processing" | "editor";
type CreatorStep = "type-select" | "input" | "processing" | "images";
type AIProvider = "gemini" | "openai" | "stability" | "";

interface CarouselTypeInfo {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  outputExample: string;
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
  isHook?: boolean;
  isCta?: boolean;
  base64Image?: string;
  imageUrl?: string;
}

interface CarouselDraft {
  title: string;
  carouselType: string;
  aiProvider: AIProvider;
  slides: SlideMessage[];
  processedSlides: ProcessedSlide[];
  step: CreatorStep;
  savedAt: number;
  carouselId?: string;
}

const DEFAULT_CAROUSEL_TYPES: CarouselTypeInfo[] = [
  { 
    id: "custom", 
    name: "Custom", 
    shortDescription: "Any length you need",
    fullDescription: "Create a carousel with any number of slides (minimum 2). Perfect when you have specific content that doesn't fit other templates.",
    outputExample: "You decide the structure. Add as many slides as you need - minimum 2 slides required.",
    slideCount: { min: 2, max: 20 } 
  },
  { 
    id: "story-flow", 
    name: "Story", 
    shortDescription: "Tell a narrative",
    fullDescription: "Perfect for sharing personal experiences, case studies, or step-by-step journeys. Each slide builds on the previous one to create a compelling story arc.",
    outputExample: "Slide 1: Hook with a relatable problem. Slides 2-4: Your journey or solution. Final slide: Key takeaway and call-to-action.",
    slideCount: { min: 3, max: 5 } 
  },
  { 
    id: "tips-howto", 
    name: "Tips & How-To", 
    shortDescription: "Share actionable advice",
    fullDescription: "Great for sharing practical tips, tutorials, or step-by-step guides. Each slide presents one clear, actionable piece of advice.",
    outputExample: "Slide 1: Bold hook (e.g., '5 Ways to...'). Slides 2-4: One tip per slide with clear visuals. Final slide: Summary or follow CTA.",
    slideCount: { min: 3, max: 5 } 
  },
  { 
    id: "stats-data", 
    name: "Stats & Data", 
    shortDescription: "Present key numbers",
    fullDescription: "Ideal for sharing research findings, industry insights, or data-driven content. Makes complex information visually digestible.",
    outputExample: "Slide 1: Attention-grabbing headline stat. Slides 2-4: Supporting data points with context. Final slide: Conclusion or insight.",
    slideCount: { min: 3, max: 5 } 
  },
  { 
    id: "before-after", 
    name: "Before/After", 
    shortDescription: "Show transformation",
    fullDescription: "Best for showcasing transformations, comparisons, or progress. Creates a clear visual contrast between two states.",
    outputExample: "Slide 1: The problem or 'before' state. Slide 2: The solution or process. Slide 3-4: The 'after' result with proof.",
    slideCount: { min: 2, max: 4 } 
  },
  { 
    id: "quote-inspiration", 
    name: "Quote", 
    shortDescription: "Feature powerful quotes",
    fullDescription: "Perfect for thought leadership, motivational content, or sharing wisdom. Each slide features impactful quotes with visual appeal.",
    outputExample: "Slide 1: Main quote with visual impact. Slides 2-3: Supporting quotes or context. Final slide: Your insight or CTA.",
    slideCount: { min: 2, max: 4 } 
  },
];

const STEPS = [
  { id: "type-select", label: "Setup", icon: FileText },
  { id: "input", label: "Content", icon: Palette },
  { id: "images", label: "Preview", icon: ImageIcon },
];

export default function Create() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("dashboard");
  const [step, setStep] = useState<CreatorStep>("type-select");
  const [selectedCarouselType, setSelectedCarouselType] = useState<string>("");
  const [aiProvider, setAiProvider] = useState<AIProvider>("");
  const [carouselTitle, setCarouselTitle] = useState("");
  const [slides, setSlides] = useState<SlideMessage[]>([
    { id: 1, text: "" },
    { id: 2, text: "" },
    { id: 3, text: "" },
  ]);
  const [processedSlides, setProcessedSlides] = useState<ProcessedSlide[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlCarouselType, setUrlCarouselType] = useState<string>("tips-howto");
  const [currentCarouselId, setCurrentCarouselId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record voice notes.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const voiceProcessMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("carouselType", urlCarouselType);
      
      const response = await fetch("/api/carousel/from-voice", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process voice recording");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.slides && data.slides.length > 0) {
        setCarouselTitle(data.title || "Voice-to-Carousel");
        setSelectedCarouselType(data.carouselType || urlCarouselType);
        setProcessedSlides(data.slides);
        const slideMessages = data.slides.map((s: ProcessedSlide, idx: number) => ({
          id: idx + 1,
          text: s.rawText || s.finalText,
        }));
        setSlides(slideMessages);
        setStep("input");
        setWorkspaceView("manual");
        toast({
          title: "Voice Processed",
          description: `Transcribed and generated ${data.slides.length} slides.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
      setWorkspaceView("voice-input");
    },
  });

  const handleVoiceSubmit = () => {
    if (!audioBlob) return;
    setWorkspaceView("voice-processing");
    voiceProcessMutation.mutate(audioBlob);
  };

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
        carouselId: currentCarouselId || undefined,
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
        
        // Normalize legacy "auto" provider to empty string
        const validProviders = ["gemini", "openai", "stability"];
        const normalizedProvider = validProviders.includes(draft.aiProvider as string) 
          ? draft.aiProvider 
          : "";
        setAiProvider(normalizedProvider);
        
        // Normalize slides on load - trim text
        const normalizedSlides = draft.slides.map(s => ({
          ...s,
          text: s.text.trim()
        }));
        setSlides(normalizedSlides);
        
        // Normalize processedSlides - no character limits
        const normalizedProcessedSlides = draft.processedSlides.map((slide, index) => {
          const isFirstSlide = index === 0;
          const isLastSlide = index === draft.processedSlides.length - 1;
          const finalText = (slide.finalText || "").trim();
          
          return {
            ...slide,
            finalText,
            charCount: finalText.length,
            isHook: isFirstSlide,
            isCta: isLastSlide,
          };
        });
        
        setProcessedSlides(normalizedProcessedSlides);
        setHasDraft(false);
        
        // Restore carouselId if available
        if (draft.carouselId) {
          setCurrentCarouselId(draft.carouselId);
        }
        
        const hasImages = normalizedProcessedSlides.some(slide => slide.base64Image || slide.imageUrl);
        if (draft.step === "images" && !hasImages) {
          setStep("processing");
          toast({
            title: "Draft Restored",
            description: "Your text has been loaded. Please regenerate images.",
          });
        } else {
          setStep(draft.step);
          if (!normalizedProvider) {
            toast({
              title: "Draft Restored",
              description: "Please select an AI provider to continue generating images.",
            });
          } else {
            toast({
              title: "Draft Restored",
              description: "Your previous work has been loaded.",
            });
          }
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

  const handleDownloadPdf = async () => {
    if (processedSlides.length === 0) {
      toast({
        title: "No images",
        description: "Please generate images first",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const images = processedSlides
        .filter(s => s.base64Image || s.imageUrl)
        .map(s => s.base64Image || s.imageUrl);
      
      if (images.length === 0) {
        throw new Error("No images available");
      }

      // Use dedicated carousel PDF endpoint if we have a carouselId, otherwise fall back to generic endpoint
      let data;
      if (currentCarouselId) {
        const response = await apiRequest("POST", `/api/carousel/${currentCarouselId}/create-pdf`, {});
        data = await response.json();
      } else {
        const response = await apiRequest("POST", "/api/pdf/create", {
          images,
          title: carouselTitle || "LinkedIn Carousel"
        });
        data = await response.json();
      }

      if (data.pdfBase64) {
        const base64Data = data.pdfBase64.includes(",") 
          ? data.pdfBase64.split(",")[1] 
          : data.pdfBase64;
        
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${carouselTitle || "carousel"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        
        toast({
          title: "Downloaded!",
          description: "Your PDF carousel has been downloaded",
        });
      } else {
        throw new Error("No PDF data received");
      }
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to create PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
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
    onSuccess: async (data) => {
      if (data.slides) {
        setProcessedSlides(data.slides);
        setStep("processing");
        
        // Save carousel to Firestore for persistence
        try {
          const createResponse = await apiRequest("POST", "/api/carousel", {
            title: carouselTitle || "Untitled Carousel",
            carouselType: selectedCarouselType,
            slides: data.slides,
          });
          const createData = await createResponse.json();
          if (createData.carousel?.id) {
            setCurrentCarouselId(createData.carousel.id);
          }
        } catch (e) {
          console.warn("Failed to save carousel to Firestore:", e);
        }
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
      // Validate minimum 2 slides with content
      const filledSlideCount = processedSlides.filter(s => s.finalText?.trim()).length;
      if (filledSlideCount < 2) {
        throw new Error("You need at least 2 slides with content to generate images. Please add more slides.");
      }
      
      // Explicit provider validation - reject if not valid
      const validProviders = ["gemini", "openai", "stability"];
      if (!validProviders.includes(aiProvider)) {
        throw new Error("Please select an AI provider (Gemini, OpenAI, or Stability AI) before generating images.");
      }
      
      // If we have a carousel ID, use the Firestore-integrated endpoint
      if (currentCarouselId) {
        const response = await apiRequest("POST", `/api/carousel/${currentCarouselId}/generate-images`, {
          provider: aiProvider,
        });
        return await response.json();
      }
      
      // Fallback to direct image generation
      const slides = processedSlides.map((s, index) => ({
        text: s.finalText,
        isHook: index === 0,
        isCta: index === processedSlides.length - 1,
      }));
      const response = await apiRequest("POST", "/api/images/generate", {
        slides,
        title: carouselTitle,
        carouselType: selectedCarouselType,
        provider: aiProvider,
      });
      return await response.json();
    },
    onSuccess: async (data) => {
      // Handle response from Firestore-integrated endpoint
      if (data.carousel?.slides) {
        setProcessedSlides(data.carousel.slides);
        setCurrentImageIndex(0);
        setStep("images");
        saveDraft();
        toast({
          title: "Images Generated",
          description: `Created ${data.generatedCount || data.carousel.slides.filter((s: ProcessedSlide) => s.base64Image).length} images`,
        });
        return;
      }
      
      // Handle legacy endpoint response
      if (data.imageUrls && data.imageUrls.length > 0) {
        const updatedSlides = processedSlides.map((slide, idx) => ({
          ...slide,
          base64Image: data.imageUrls[idx] || undefined,
        }));
        setProcessedSlides(updatedSlides);
        setCurrentImageIndex(0);
        setStep("images");
        saveDraft();
        
        // Save images to Firestore if we have a carousel ID
        if (currentCarouselId) {
          try {
            await apiRequest("PUT", `/api/carousel/${currentCarouselId}`, {
              slides: updatedSlides,
              status: "images_generated",
            });
          } catch (e) {
            console.warn("Failed to save images to Firestore:", e);
          }
        }
        
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

  const urlProcessMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/carousel/from-url", {
        url: urlInput,
        carouselType: urlCarouselType,
        aiProvider: aiProvider,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.slides && data.slides.length > 0) {
        setCarouselTitle(data.title || "Carousel from URL");
        setSelectedCarouselType(data.carouselType || urlCarouselType);
        setProcessedSlides(data.slides);
        const slideMessages = data.slides.map((s: ProcessedSlide, idx: number) => ({
          id: idx + 1,
          text: s.rawText || s.finalText,
        }));
        setSlides(slideMessages);
        setStep("input");
        setWorkspaceView("manual");
        toast({
          title: "Content Generated",
          description: `Created ${data.slides.length} slides from the URL. Click Generate Images to continue.`,
        });
      } else if (data.error) {
        toast({
          title: "Generation Failed",
          description: data.error,
          variant: "destructive",
        });
        setWorkspaceView("url-input");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to create carousel from URL",
        variant: "destructive",
      });
      setWorkspaceView("url-input");
    },
  });

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }
    setWorkspaceView("url-processing");
    urlProcessMutation.mutate();
  };

  const addSlide = () => {
    const typeInfo = DEFAULT_CAROUSEL_TYPES.find(t => t.id === selectedCarouselType);
    const maxSlides = typeInfo?.slideCount.max || 5;
    if (slides.length < maxSlides) {
      setSlides([...slides, { id: Date.now(), text: "" }]);
    }
  };

  const removeSlide = (id: number) => {
    if (slides.length > 1) {
      setSlides(slides.filter(s => s.id !== id));
    }
  };

  const removeProcessedSlide = (index: number) => {
    if (processedSlides.length > 1) {
      setProcessedSlides(processedSlides.filter((_, idx) => idx !== index));
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
      default: return "Not Selected";
    }
  };

  const getTypeName = (typeId: string) => {
    return DEFAULT_CAROUSEL_TYPES.find(t => t.id === typeId)?.name || typeId;
  };

  const filledSlides = slides.filter(s => s.text.trim()).length;
  const typeInfo = DEFAULT_CAROUSEL_TYPES.find(t => t.id === selectedCarouselType);
  const currentStepIndex = STEPS.findIndex(s => s.id === step);
  
  // Validate aiProvider is one of the valid options
  const validProviders = ["gemini", "openai", "stability"];
  const isValidProvider = validProviders.includes(aiProvider);
  const canProcess = filledSlides >= 2 && isValidProvider;

  return (
    <div className="min-h-screen bg-background">
      <Header variant="app" />
      
      <main className="container mx-auto max-w-3xl py-12 px-4 relative z-0">
        {/* Dashboard View - Choose creation method */}
        {workspaceView === "dashboard" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight" data-testid="text-dashboard-title">
                Create Your Carousel
              </h1>
              <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
                Choose how you want to create your LinkedIn carousel
              </p>
            </div>

            {/* Draft Banner */}
            {hasDraft && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">Continue your draft?</p>
                    <p className="text-sm text-muted-foreground">Pick up where you left off</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={clearDraft} data-testid="button-discard-draft">
                      Start Fresh
                    </Button>
                    <Button size="sm" onClick={() => { loadDraft(); setWorkspaceView("manual"); }} data-testid="button-load-draft">
                      Load Draft
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Manual Creation Option */}
              <Card 
                className="hover-elevate cursor-pointer border-2 border-transparent hover:border-primary/20 transition-all"
                onClick={() => setWorkspaceView("manual")}
                data-testid="card-manual-create"
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <PenTool className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Create Manually</h3>
                    <p className="text-muted-foreground mt-1">
                      Write your own content slide by slide. Perfect when you have specific ideas in mind.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary">Full Control</Badge>
                    <Badge variant="outline">3-5 Slides</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* URL-based Creation Option */}
              <Card 
                className="hover-elevate cursor-pointer border-2 border-transparent hover:border-primary/20 transition-all"
                onClick={() => setWorkspaceView("url-input")}
                data-testid="card-url-create"
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Create from URL</h3>
                    <p className="text-muted-foreground mt-1">
                      Paste a blog or article URL and let AI generate a carousel from the content.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="default">AI-Powered</Badge>
                    <Badge variant="outline">7-10 Slides</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Voice-based Creation Option */}
              <Card 
                className="hover-elevate cursor-pointer border-2 border-transparent hover:border-primary/20 transition-all"
                onClick={() => setWorkspaceView("voice-input")}
                data-testid="card-voice-create"
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Mic className="w-7 h-7 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Create from Voice</h3>
                    <p className="text-muted-foreground mt-1">
                      Record a voice note and let AI turn it into a LinkedIn carousel.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-none">AI-Powered</Badge>
                    <Badge variant="outline">5-10 Slides</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* URL Input View */}
        {workspaceView === "url-input" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight" data-testid="text-url-title">
                Create from URL
              </h1>
              <p className="text-muted-foreground" data-testid="text-url-subtitle">
                Paste a blog or article URL to generate your carousel
              </p>
              <Button 
                variant="ghost" 
                onClick={() => setWorkspaceView("manual")}
                className="text-sm underline underline-offset-4"
                data-testid="button-switch-to-text"
              >
                <PenTool className="w-4 h-4 mr-1" />
                Or create manually with your own text
              </Button>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="url-input" className="text-sm font-medium">Blog or Article URL</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="url-input"
                        type="url"
                        placeholder="https://example.com/your-article"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="h-11 pl-10"
                        data-testid="input-url"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Works best with blog posts, articles, and news content
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Carousel Style</Label>
                    <Select value={urlCarouselType} onValueChange={setUrlCarouselType}>
                      <SelectTrigger className="h-11" data-testid="select-url-carousel-type">
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_CAROUSEL_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} - {type.shortDescription}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">AI Provider (Required)</Label>
                    <Select value={aiProvider} onValueChange={(v) => setAiProvider(v as AIProvider)}>
                      <SelectTrigger className="h-11" data-testid="select-url-ai-provider">
                        <SelectValue placeholder="Select AI Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="openai">OpenAI DALL-E</SelectItem>
                        <SelectItem value="stability">Stability AI</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Choose which AI provider will generate your images</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setWorkspaceView("dashboard")}
                    data-testid="button-back-to-dashboard"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim() || !aiProvider || urlProcessMutation.isPending}
                    data-testid="button-generate-from-url"
                  >
                    {urlProcessMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Carousel
                  </Button>
                </div>
                {!aiProvider && urlInput.trim() && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 text-center">
                    Please select an AI provider above
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Voice Input View */}
        {workspaceView === "voice-input" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight" data-testid="text-voice-title">
                Create from Voice
              </h1>
              <p className="text-muted-foreground" data-testid="text-voice-subtitle">
                Record a voice note and let AI structure it into a carousel
              </p>
            </div>

            <Card className="border-0 shadow-sm max-w-md mx-auto">
              <CardContent className="pt-8 pb-8 flex flex-col items-center space-y-8">
                <div className="relative">
                  {isRecording && (
                    <div className="absolute -inset-4 bg-purple-500/20 rounded-full animate-ping" />
                  )}
                  <Button
                    size="icon"
                    className={`w-24 h-24 rounded-full transition-all duration-300 ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30'
                    }`}
                    onClick={isRecording ? stopRecording : startRecording}
                    data-testid="button-record-toggle"
                  >
                    {isRecording ? (
                      <Square className="w-10 h-10 fill-white" />
                    ) : (
                      <Mic className="w-10 h-10" />
                    )}
                  </Button>
                </div>

                <div className="text-center space-y-2">
                  <div className="text-3xl font-mono font-medium">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isRecording ? "Recording... tap to stop" : audioBlob ? "Recording complete!" : "Tap microphone to start recording"}
                  </p>
                </div>

                {audioBlob && !isRecording && (
                  <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Carousel Style</Label>
                        <Select value={urlCarouselType} onValueChange={setUrlCarouselType}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEFAULT_CAROUSEL_TYPES.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">AI Provider</Label>
                        <Select value={aiProvider} onValueChange={(v) => setAiProvider(v as AIProvider)}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select AI Provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gemini">Google Gemini</SelectItem>
                            <SelectItem value="openai">OpenAI DALL-E</SelectItem>
                            <SelectItem value="stability">Stability AI</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
                      >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                      <Button 
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        onClick={handleVoiceSubmit}
                        disabled={!aiProvider || voiceProcessMutation.isPending}
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate
                      </Button>
                    </div>
                  </div>
                )}
                
                {!audioBlob && !isRecording && (
                   <Button 
                    variant="ghost" 
                    onClick={() => setWorkspaceView("dashboard")}
                    className="mt-4"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {(workspaceView === "url-processing" || workspaceView === "voice-processing") && (
          <div className="min-h-[400px] flex flex-col items-center justify-center space-y-8 text-center">
            <div className="relative">
              <div className={`w-24 h-24 border-4 ${workspaceView === 'voice-processing' ? 'border-purple-500/20 border-t-purple-500' : 'border-primary/20 border-t-primary'} rounded-full animate-spin`} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className={`w-10 h-10 ${workspaceView === 'voice-processing' ? 'text-purple-500' : 'text-primary'}`} />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold animate-pulse tracking-tight">
                {workspaceView === "voice-processing" ? "Transcribing & Designing..." : "Designing your carousel..."}
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {workspaceView === "voice-processing" 
                  ? "We're turning your voice note into professional LinkedIn slides." 
                  : "Our AI is analyzing the content and creating slides for you."}
              </p>
            </div>
          </div>
        )}

        {/* Manual Creation Flow */}
        {workspaceView === "manual" && (
          <>
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

            {/* Step 1: Setup */}
            {step === "type-select" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Create Carousel</h1>
              <p className="text-muted-foreground">Set up your carousel preferences</p>
              <Button 
                variant="ghost" 
                onClick={() => setWorkspaceView("url-input")}
                className="text-sm underline underline-offset-4"
                data-testid="button-switch-to-url"
              >
                <Globe className="w-4 h-4 mr-1" />
                Or create from a URL instead
              </Button>
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
                            <span className="flex flex-col items-start">
                              <span>{type.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">AI Provider (Required)</Label>
                    <Select value={aiProvider} onValueChange={(v) => setAiProvider(v as AIProvider)}>
                      <SelectTrigger className="h-11" data-testid="select-ai-provider">
                        <SelectValue placeholder="Select AI Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="openai">OpenAI DALL-E</SelectItem>
                        <SelectItem value="stability">Stability AI</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Choose which AI provider will generate your images</p>
                  </div>
                </div>

                {/* Type Description Panel - Shows when type is selected */}
                {selectedCarouselType && (() => {
                  const selectedType = DEFAULT_CAROUSEL_TYPES.find(t => t.id === selectedCarouselType);
                  if (!selectedType) return null;
                  return (
                    <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                      <div>
                        <h3 className="font-medium text-foreground">{selectedType.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{selectedType.fullDescription}</p>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Expected Output</p>
                        <p className="text-sm text-foreground">{selectedType.outputExample}</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-4">
                  <Button
                    className="w-full h-11"
                    onClick={() => setStep("input")}
                    disabled={!selectedCarouselType || !aiProvider}
                    data-testid="button-next-step"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  {!aiProvider && selectedCarouselType && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 text-center">
                      Please select an AI provider to continue
                    </p>
                  )}
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
                  const charCount = slide.text.trim().length;
                  
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
                          <span className="text-xs text-muted-foreground">
                            {charCount} chars
                          </span>
                          {slides.length > 1 && (
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
                        className="resize-none"
                        data-testid={`textarea-slide-${index}`}
                      />
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
                      onClick={async () => {
                        const rawTexts = slides.map(s => s.text.trim()).filter(t => t.length > 0);
                        const response = await apiRequest("POST", "/api/carousel/process", {
                          rawTexts,
                          carouselType: selectedCarouselType,
                          title: carouselTitle,
                        });
                        const data = await response.json();
                        if (data.slides) {
                          setProcessedSlides(data.slides);
                          generateImagesMutation.mutate();
                        }
                      }}
                      disabled={!canProcess || processTextMutation.isPending || generateImagesMutation.isPending}
                      data-testid="button-generate-images"
                    >
                      {(processTextMutation.isPending || generateImagesMutation.isPending) ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Generate Images
                    </Button>
                  </div>
                </div>
                {!aiProvider && filledSlides >= 2 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 text-center">
                    Go back to select an AI provider before generating images
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Preview with Download & Post Options */}
        {step === "images" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Your Carousel is Ready</h1>
                <p className="text-muted-foreground mt-1">Download, preview, or post to LinkedIn</p>
              </div>
              <Badge variant="secondary" className="font-normal">{getProviderName(aiProvider)}</Badge>
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

                  {(processedSlides[currentImageIndex]?.base64Image || processedSlides[currentImageIndex]?.imageUrl) ? (
                    <img
                      src={processedSlides[currentImageIndex].base64Image || processedSlides[currentImageIndex].imageUrl}
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
                        {(slide.base64Image || slide.imageUrl) ? (
                          <img 
                            src={slide.base64Image || slide.imageUrl} 
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
              </CardContent>
            </Card>

            {/* Action Cards - Download, Preview, LinkedIn Post */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Download PDF Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Download className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Download PDF</h3>
                      <p className="text-xs text-muted-foreground">Save to your device</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    data-testid="button-download-pdf"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download
                  </Button>
                </CardContent>
              </Card>

              {/* Preview Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">Full Preview</h3>
                      <p className="text-xs text-muted-foreground">LinkedIn-style view</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full" 
                    onClick={handlePreview}
                    data-testid="button-full-preview"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </CardContent>
              </Card>

              {/* Post to LinkedIn Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#0077B5]/10 flex items-center justify-center">
                      <SiLinkedin className="w-5 h-5 text-[#0077B5]" />
                    </div>
                    <div>
                      <h3 className="font-medium">Post to LinkedIn</h3>
                      <p className="text-xs text-muted-foreground">Share with your network</p>
                    </div>
                  </div>
                  {user && user.authProvider === 'linkedin' ? (
                    <Button 
                      className="w-full bg-[#0077B5] hover:bg-[#006699]"
                      onClick={handlePreview}
                      data-testid="button-post-linkedin"
                    >
                      <SiLinkedin className="w-4 h-4 mr-2" />
                      Post Now
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => window.location.href = "/auth/linkedin"}
                      data-testid="button-linkedin-login"
                    >
                      <SiLinkedin className="w-4 h-4 mr-2" />
                      Connect LinkedIn
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Back/Edit Button */}
            <div className="flex items-center justify-between gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setStep("input")}
                data-testid="button-back-to-edit"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Edit Content
              </Button>
              <Button variant="outline" onClick={saveDraft} data-testid="button-save-progress">
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
