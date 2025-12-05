import { useState, useEffect, useCallback } from "react";
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
  FileImage, 
  Upload, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Wand2,
  RotateCcw,
  BookOpen,
  Layers,
  Save,
  FolderOpen,
  CheckCircle2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const STORAGE_KEY = "carousel_generated_images";
const STORAGE_TITLE_KEY = "carousel_title";

type CarouselStep = "type-select" | "input" | "processing" | "preview" | "review";
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

interface Carousel {
  id: string;
  userId: string;
  title: string;
  carouselType: string;
  slides: ProcessedSlide[];
  pdfBase64?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface GenerateImagesResponse {
  success: boolean;
  carousel?: Carousel;
  generatedCount: number;
  totalSlides: number;
  provider?: string;
  errors?: string[];
}

interface CreatePdfResponse {
  success: boolean;
  carousel?: Carousel;
  pdfBase64: string;
  pageCount: number;
}

interface UploadResponse {
  success: boolean;
  postId: string;
  message: string;
}

interface ProcessTextResponse {
  success: boolean;
  carouselType: string;
  slides: ProcessedSlide[];
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

export default function CarouselCreator() {
  const { toast } = useToast();
  const [step, setStep] = useState<CarouselStep>("type-select");
  const [selectedCarouselType, setSelectedCarouselType] = useState<string>("");
  const [aiProvider, setAiProvider] = useState<AIProvider>("auto");
  const [slides, setSlides] = useState<SlideMessage[]>([
    { id: 1, text: "" },
    { id: 2, text: "" },
    { id: 3, text: "" },
  ]);
  const [processedSlides, setProcessedSlides] = useState<ProcessedSlide[]>([]);
  const [currentCarouselId, setCurrentCarouselId] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [carouselTitle, setCarouselTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [usedProvider, setUsedProvider] = useState<string>("");
  const [hasCachedImages, setHasCachedImages] = useState(false);
  const [showSavedCarousels, setShowSavedCarousels] = useState(false);

  const { data: carouselTypesData } = useQuery<{ carouselTypes: CarouselTypeInfo[] }>({
    queryKey: ["/api/carousel/types"],
    enabled: false,
  });

  const carouselTypes = carouselTypesData?.carouselTypes || DEFAULT_CAROUSEL_TYPES;

  const { data: savedCarouselsData, refetch: refetchCarousels } = useQuery<{ carousels: Carousel[] }>({
    queryKey: ["/api/carousels"],
  });

  const savedCarousels = savedCarouselsData?.carousels || [];

  const saveToLocalStorage = useCallback((images: string[], title: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
      localStorage.setItem(STORAGE_TITLE_KEY, title);
    } catch (e) {
      console.warn("Failed to save images to localStorage:", e);
    }
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedImages = localStorage.getItem(STORAGE_KEY);
      const savedTitle = localStorage.getItem(STORAGE_TITLE_KEY);
      if (savedImages) {
        const images = JSON.parse(savedImages) as string[];
        if (images.length > 0) {
          return { images, title: savedTitle || "" };
        }
      }
    } catch (e) {
      console.warn("Failed to load images from localStorage:", e);
    }
    return null;
  }, []);

  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TITLE_KEY);
    } catch (e) {
      console.warn("Failed to clear localStorage:", e);
    }
  }, []);

  useEffect(() => {
    const cached = loadFromLocalStorage();
    if (cached && cached.images.length > 0) {
      setHasCachedImages(true);
    }
  }, [loadFromLocalStorage]);

  const restoreCachedImages = useCallback(() => {
    const cached = loadFromLocalStorage();
    if (cached && cached.images.length > 0) {
      setProcessedSlides(cached.images.map((img, idx) => ({
        number: idx + 1,
        rawText: "",
        finalText: "",
        imagePrompt: "",
        layout: "big_text_center",
        base64Image: img,
      })));
      setCarouselTitle(cached.title);
      setCurrentImageIndex(0);
      setStep("preview");
      setHasCachedImages(false);
      toast({
        title: "Images Restored",
        description: `Recovered ${cached.images.length} previously generated images`,
      });
    }
  }, [loadFromLocalStorage, toast]);

  const downloadAllImages = useCallback((slides: ProcessedSlide[], title: string) => {
    slides.forEach((slide, index) => {
      if (slide.base64Image) {
        const link = document.createElement("a");
        link.href = slide.base64Image;
        link.download = `${title || "slide"}_${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  }, []);

  const processTextMutation = useMutation({
    mutationFn: async (): Promise<ProcessTextResponse> => {
      const rawTexts = slides.map(s => s.text).filter(t => t.trim());
      const response = await apiRequest("POST", "/api/carousel/process", {
        rawTexts,
        carouselType: selectedCarouselType,
        title: carouselTitle,
      });
      const data = await response.json();
      return data as ProcessTextResponse;
    },
    onSuccess: async (data) => {
      if (data.slides && data.slides.length > 0) {
        setProcessedSlides(data.slides);
        setStep("processing");
        
        toast({
          title: "Text Processed",
          description: `AI refined ${data.slides.length} slides for your ${selectedCarouselType} carousel`,
        });

        try {
          const createResponse = await apiRequest("POST", "/api/carousel", {
            title: carouselTitle || "Untitled Carousel",
            carouselType: selectedCarouselType,
            slides: data.slides,
          });
          const createData = await createResponse.json();
          if (createData.carousel?.id) {
            setCurrentCarouselId(createData.carousel.id);
            refetchCarousels();
          }
        } catch (e) {
          console.warn("Failed to save carousel to Firestore:", e);
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process text",
        variant: "destructive",
      });
    },
  });

  const generateImagesMutation = useMutation({
    mutationFn: async (): Promise<GenerateImagesResponse> => {
      if (currentCarouselId) {
        const response = await apiRequest("POST", `/api/carousel/${currentCarouselId}/generate-images`, {
          provider: aiProvider,
        });
        const data = await response.json();
        return data as GenerateImagesResponse;
      }
      
      const messages = processedSlides.map(s => s.imagePrompt || s.finalText);
      const response = await apiRequest("POST", "/api/images/generate", {
        messages,
        provider: aiProvider,
      });
      const data = await response.json();
      
      if (data.imageUrls && data.imageUrls.length > 0) {
        const updatedSlides = processedSlides.map((slide, idx) => ({
          ...slide,
          base64Image: data.imageUrls[idx] || undefined,
        }));
        return {
          success: true,
          carousel: {
            id: "",
            userId: "",
            title: carouselTitle,
            carouselType: selectedCarouselType,
            slides: updatedSlides,
            status: "images_generated",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          generatedCount: data.generatedCount || data.imageUrls.length,
          totalSlides: processedSlides.length,
          provider: data.provider,
          errors: data.errors,
        };
      }
      throw new Error("No images generated");
    },
    onSuccess: (data) => {
      if (data.carousel?.slides) {
        setProcessedSlides(data.carousel.slides);
        setCurrentImageIndex(0);
        setUsedProvider(data.provider || "");
        setStep("preview");
        
        const imagesWithData = data.carousel.slides.filter(s => s.base64Image);
        if (imagesWithData.length > 0) {
          saveToLocalStorage(imagesWithData.map(s => s.base64Image!), carouselTitle);
        }
        setHasCachedImages(false);
        
        const providerName = data.provider === "gemini" ? "Gemini" : data.provider === "openai" ? "OpenAI" : data.provider === "stability" ? "Stability AI" : "AI";
        toast({
          title: "Images Generated!",
          description: `Created ${data.generatedCount}/${data.totalSlides} slides using ${providerName}`,
        });

        if (currentCarouselId) {
          refetchCarousels();
        }
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

  const createPdfMutation = useMutation({
    mutationFn: async (): Promise<CreatePdfResponse> => {
      if (!currentCarouselId) {
        const imageUrls = processedSlides.filter(s => s.base64Image).map(s => s.base64Image!);
        const response = await apiRequest("POST", "/api/pdf/create", {
          imageUrls,
          title: carouselTitle || "LinkedIn Carousel",
        });
        const data = await response.json();
        return data as CreatePdfResponse;
      }
      
      const response = await apiRequest("POST", `/api/carousel/${currentCarouselId}/create-pdf`, {});
      const data = await response.json();
      return data as CreatePdfResponse;
    },
    onSuccess: (data) => {
      if (data.pdfBase64) {
        setPdfDataUrl(data.pdfBase64);
        setStep("review");
        toast({
          title: "PDF Created!",
          description: `Carousel with ${data.pageCount} slides is ready`,
        });
        refetchCarousels();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "PDF Creation Failed",
        description: error.message || "Failed to create PDF",
        variant: "destructive",
      });
    },
  });

  const uploadToLinkedInMutation = useMutation({
    mutationFn: async (): Promise<UploadResponse> => {
      if (!pdfDataUrl) {
        throw new Error("PDF data is required");
      }
      const response = await apiRequest("POST", "/api/linkedin/upload", {
        pdfBase64: pdfDataUrl,
        caption: caption,
        title: carouselTitle || "LinkedIn Carousel",
      });
      const data = await response.json();
      return data as UploadResponse;
    },
    onSuccess: () => {
      toast({
        title: "Posted to LinkedIn!",
        description: "Your carousel has been shared successfully",
      });
      handleReset();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload to LinkedIn",
        variant: "destructive",
      });
    },
  });

  const deleteCarouselMutation = useMutation({
    mutationFn: async (carouselId: string) => {
      const response = await apiRequest("DELETE", `/api/carousel/${carouselId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Carousel Deleted",
        description: "The carousel has been removed",
      });
      refetchCarousels();
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete carousel",
        variant: "destructive",
      });
    },
  });

  const loadSavedCarousel = async (carousel: Carousel) => {
    setCurrentCarouselId(carousel.id);
    setCarouselTitle(carousel.title);
    setSelectedCarouselType(carousel.carouselType);
    setProcessedSlides(carousel.slides);
    
    if (carousel.pdfBase64) {
      setPdfDataUrl(carousel.pdfBase64);
      setStep("review");
    } else if (carousel.slides.some(s => s.base64Image)) {
      setStep("preview");
    } else if (carousel.slides.length > 0) {
      setStep("processing");
    } else {
      setStep("input");
    }
    
    setShowSavedCarousels(false);
    toast({
      title: "Carousel Loaded",
      description: `Loaded "${carousel.title}"`,
    });
  };

  const addSlide = () => {
    const typeInfo = carouselTypes.find(t => t.id === selectedCarouselType);
    const maxSlides = typeInfo?.slideCount.max || 5;
    if (slides.length < maxSlides) {
      setSlides([...slides, { id: Date.now(), text: "" }]);
    }
  };

  const removeSlide = (id: number) => {
    const typeInfo = carouselTypes.find(t => t.id === selectedCarouselType);
    const minSlides = typeInfo?.slideCount.min || 2;
    if (slides.length > minSlides) {
      setSlides(slides.filter((s) => s.id !== id));
    }
  };

  const updateSlide = (id: number, text: string) => {
    setSlides(slides.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const handleSelectCarouselType = (typeId: string) => {
    setSelectedCarouselType(typeId);
    const typeInfo = carouselTypes.find(t => t.id === typeId);
    if (typeInfo) {
      const initialSlides = Array.from({ length: typeInfo.slideCount.min }, (_, i) => ({
        id: i + 1,
        text: "",
      }));
      setSlides(initialSlides);
    }
    setStep("input");
  };

  const handleProcessText = () => {
    const messages = slides.map((s) => s.text).filter((t) => t.trim());
    const typeInfo = carouselTypes.find(t => t.id === selectedCarouselType);
    const minSlides = typeInfo?.slideCount.min || 2;
    
    if (messages.length < minSlides) {
      toast({
        title: "Not enough content",
        description: `Please enter at least ${minSlides} slides with text for ${typeInfo?.name || "this"} carousel`,
        variant: "destructive",
      });
      return;
    }
    processTextMutation.mutate();
  };

  const handleGenerateImages = () => {
    generateImagesMutation.mutate();
  };

  const handleCreatePdf = () => {
    const hasImages = processedSlides.some(s => s.base64Image);
    if (!hasImages) {
      toast({
        title: "No images",
        description: "Please generate images first",
        variant: "destructive",
      });
      return;
    }
    createPdfMutation.mutate();
  };

  const handleUploadToLinkedIn = () => {
    if (!pdfDataUrl) {
      toast({
        title: "No PDF",
        description: "Please create a PDF first",
        variant: "destructive",
      });
      return;
    }
    uploadToLinkedInMutation.mutate();
  };

  const handleReset = () => {
    setStep("type-select");
    setSelectedCarouselType("");
    setSlides([
      { id: 1, text: "" },
      { id: 2, text: "" },
      { id: 3, text: "" },
    ]);
    setProcessedSlides([]);
    setCurrentCarouselId(null);
    setCurrentImageIndex(0);
    setPdfDataUrl(null);
    setCarouselTitle("");
    setCaption("");
    setUsedProvider("");
    clearLocalStorage();
    setHasCachedImages(false);
  };

  const navigateImage = (direction: "prev" | "next") => {
    const imagesWithData = processedSlides.filter(s => s.base64Image);
    if (direction === "prev" && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    } else if (direction === "next" && currentImageIndex < imagesWithData.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handleDownloadPdf = () => {
    if (pdfDataUrl) {
      const link = document.createElement("a");
      link.href = pdfDataUrl;
      link.download = `${carouselTitle || "carousel"}.pdf`;
      link.click();
    }
  };

  const isLoading = processTextMutation.isPending || generateImagesMutation.isPending || createPdfMutation.isPending || uploadToLinkedInMutation.isPending;

  const imagesWithData = processedSlides.filter(s => s.base64Image);

  return (
    <Card data-testid="card-carousel-creator">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">AI Carousel Creator</CardTitle>
              <CardDescription>
                Create stunning LinkedIn carousels with AI-generated images
              </CardDescription>
            </div>
          </div>
          {savedCarousels.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSavedCarousels(!showSavedCarousels)}
              data-testid="button-toggle-saved"
            >
              <FolderOpen className="w-4 h-4 mr-1" />
              Saved ({savedCarousels.length})
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {showSavedCarousels && savedCarousels.length > 0 && (
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <Label className="text-sm font-medium">Your Saved Carousels</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {savedCarousels.map((carousel) => (
                <div
                  key={carousel.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border"
                  data-testid={`card-saved-carousel-${carousel.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{carousel.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{carousel.carouselType}</Badge>
                      <span>{carousel.slides.length} slides</span>
                      <span>{carousel.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadSavedCarousel(carousel)}
                      data-testid={`button-load-carousel-${carousel.id}`}
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCarouselMutation.mutate(carousel.id)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-carousel-${carousel.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "type-select" && (
          <>
            {hasCachedImages && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Previously generated images found
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        You have unsaved images from a previous session
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={restoreCachedImages}
                    className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                    data-testid="button-restore-cached"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restore
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carousel-type" className="text-sm font-medium">Carousel Style</Label>
                  <Select 
                    value={selectedCarouselType} 
                    onValueChange={(value) => setSelectedCarouselType(value)}
                  >
                    <SelectTrigger id="carousel-type" className="border-slate-200" data-testid="select-carousel-type">
                      <SelectValue placeholder="Select a carousel style" />
                    </SelectTrigger>
                    <SelectContent>
                      {carouselTypes.map((type) => (
                        <SelectItem 
                          key={type.id} 
                          value={type.id}
                          data-testid={`select-option-type-${type.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-muted-foreground" />
                            <span>{type.name}</span>
                            <span className="text-xs text-muted-foreground">({type.slideCount.min}-{type.slideCount.max} slides)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCarouselType && (
                    <p className="text-xs text-muted-foreground">
                      {carouselTypes.find(t => t.id === selectedCarouselType)?.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-provider-select" className="text-sm font-medium">AI Provider (for images)</Label>
                  <Select value={aiProvider} onValueChange={(v) => setAiProvider(v as AIProvider)}>
                    <SelectTrigger id="ai-provider-select" className="border-slate-200" data-testid="select-ai-provider-type">
                      <SelectValue placeholder="Select AI provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" data-testid="select-option-ai-auto">
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-4 h-4 text-blue-600" />
                          <span>Auto (Best Available)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="gemini" data-testid="select-option-ai-gemini">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          <span>Google Gemini</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="openai" data-testid="select-option-ai-openai">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-green-600" />
                          <span>OpenAI DALL-E</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="stability" data-testid="select-option-ai-stability">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span>Stability AI</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {aiProvider === "auto" && "Automatically selects the best available AI"}
                    {aiProvider === "gemini" && "Google's Gemini for high-quality images"}
                    {aiProvider === "openai" && "OpenAI DALL-E 3 for creative images"}
                    {aiProvider === "stability" && "Stability AI for artistic images"}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => {
                  if (selectedCarouselType) {
                    handleSelectCarouselType(selectedCarouselType);
                  }
                }}
                disabled={!selectedCarouselType}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                data-testid="button-continue-to-input"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "input" && (
          <>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("type-select")}
                data-testid="button-back-to-type"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Badge variant="secondary">
                {carouselTypes.find(t => t.id === selectedCarouselType)?.name || selectedCarouselType}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {aiProvider === "auto" ? "Auto AI" : 
                 aiProvider === "gemini" ? "Gemini" :
                 aiProvider === "openai" ? "DALL-E" : "Stability AI"}
              </Badge>
            </div>

            <div className="space-y-2 mb-4">
              <Label htmlFor="carousel-title" className="text-sm font-medium">Carousel Title</Label>
              <Input
                id="carousel-title"
                placeholder="e.g., 5 Tips for Better Productivity"
                value={carouselTitle}
                onChange={(e) => setCarouselTitle(e.target.value)}
                maxLength={100}
                className="border-slate-200"
                data-testid="input-carousel-title"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Slide Content ({slides.length}/{carouselTypes.find(t => t.id === selectedCarouselType)?.slideCount.max || 5})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSlide}
                  disabled={slides.length >= (carouselTypes.find(t => t.id === selectedCarouselType)?.slideCount.max || 5)}
                  data-testid="button-add-slide"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Slide
                </Button>
              </div>

              <div className="space-y-3">
                {slides.map((slide, index) => (
                  <div key={slide.id} className="flex gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <Textarea
                        placeholder={`Slide ${index + 1}: Enter your raw message (AI will refine it)...`}
                        value={slide.text}
                        onChange={(e) => updateSlide(slide.id, e.target.value)}
                        className="min-h-20 resize-none"
                        maxLength={500}
                        data-testid={`input-slide-${index}`}
                      />
                    </div>
                    {slides.length > (carouselTypes.find(t => t.id === selectedCarouselType)?.slideCount.min || 2) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSlide(slide.id)}
                        className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                        data-testid={`button-remove-slide-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleProcessText}
                disabled={isLoading || slides.every((s) => !s.text.trim())}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                data-testid="button-process-text"
              >
                {processTextMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Process with AI
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === "processing" && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  AI-Refined Slides ({processedSlides.length} slides)
                </Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep("input")}
                  data-testid="button-back-to-input"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Edit Raw Text
                </Button>
              </div>

              <div className="space-y-3">
                {processedSlides.map((slide, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                          {slide.number}
                        </span>
                        <Badge variant="outline">{slide.layout}</Badge>
                      </div>
                      {slide.base64Image && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm font-medium mb-2">{slide.finalText}</p>
                    <p className="text-xs text-muted-foreground italic">
                      Image: {slide.imagePrompt.slice(0, 100)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-3 flex-wrap">
              <Button variant="outline" onClick={handleReset} data-testid="button-start-over-processing">
                Start Over
              </Button>
              <Button
                onClick={handleGenerateImages}
                disabled={isLoading || processedSlides.length === 0}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                data-testid="button-generate-images"
              >
                {generateImagesMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Images...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Images
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === "preview" && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Preview Your Slides ({imagesWithData.length} images)
                </Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep("processing")}
                  data-testid="button-back-to-processing"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back to Slides
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imagesWithData.map((slide, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2 border rounded-lg shadow-sm cursor-pointer transition-all ${
                      idx === currentImageIndex 
                        ? "ring-2 ring-primary border-primary" 
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setCurrentImageIndex(idx)}
                    data-testid={`card-slide-preview-${idx}`}
                  >
                    <img
                      src={slide.base64Image}
                      alt={`Slide ${idx + 1}`}
                      className="w-full aspect-square object-cover rounded-md"
                      data-testid={`image-slide-${idx}`}
                    />
                    <p className="text-center text-sm mt-2 font-medium text-muted-foreground">
                      Slide {slide.number}
                    </p>
                  </div>
                ))}
              </div>

              {imagesWithData[currentImageIndex] && (
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block">
                    Selected: Slide {imagesWithData[currentImageIndex].number}
                  </Label>
                  <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={imagesWithData[currentImageIndex].base64Image}
                      alt={`Slide ${currentImageIndex + 1} - Large Preview`}
                      className="w-full h-full object-cover"
                      data-testid="image-slide-large-preview"
                    />
                    {imagesWithData.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 shadow-md"
                          onClick={() => navigateImage("prev")}
                          disabled={currentImageIndex === 0}
                          data-testid="button-prev-image"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 shadow-md"
                          onClick={() => navigateImage("next")}
                          disabled={currentImageIndex === imagesWithData.length - 1}
                          data-testid="button-next-image"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3 flex-wrap">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleReset} 
                  data-testid="button-start-over-preview"
                >
                  Start Over
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadAllImages(processedSlides, carouselTitle)}
                  disabled={imagesWithData.length === 0}
                  data-testid="button-download-all-images"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download All
                </Button>
              </div>
              <Button
                onClick={handleCreatePdf}
                disabled={isLoading || imagesWithData.length === 0}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                data-testid="button-create-pdf"
              >
                {createPdfMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating PDF...
                  </>
                ) : (
                  <>
                    <FileImage className="w-4 h-4 mr-2" />
                    Create PDF Carousel
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Review & Upload</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep("preview")}
                  data-testid="button-back-to-preview"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back to Preview
                </Button>
              </div>

              {pdfDataUrl && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <FileImage className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{carouselTitle || "LinkedIn Carousel"}.pdf</p>
                      <p className="text-sm text-muted-foreground">
                        {imagesWithData.length} slides ready to upload
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPdf}
                      data-testid="button-download-pdf"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="caption" className="text-sm font-medium">
                  Caption (optional)
                </Label>
                <Textarea
                  id="caption"
                  placeholder="Add a caption for your LinkedIn post..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="min-h-24 resize-none"
                  maxLength={3000}
                  data-testid="input-caption"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {caption.length} / 3,000 characters
                </p>
              </div>
            </div>

            <div className="flex justify-between gap-3 flex-wrap">
              <Button 
                variant="outline" 
                onClick={handleReset} 
                data-testid="button-start-over-review"
              >
                Start Over
              </Button>
              <Button
                onClick={handleUploadToLinkedIn}
                disabled={isLoading || !pdfDataUrl}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                data-testid="button-upload-linkedin"
              >
                {uploadToLinkedInMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Post to LinkedIn
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
