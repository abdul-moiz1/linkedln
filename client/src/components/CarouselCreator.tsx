import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const STORAGE_KEY = "carousel_generated_images";
const STORAGE_TITLE_KEY = "carousel_title";

type CarouselStep = "input" | "preview" | "review";
type AIProvider = "auto" | "gemini" | "openai" | "stability";

interface SlideMessage {
  id: number;
  text: string;
}

interface GenerateImagesResponse {
  success: boolean;
  imageUrls: string[];
  generatedCount: number;
  requestedCount: number;
  provider?: string;
  errors?: string[];
}

interface CreatePdfResponse {
  success: boolean;
  pdfUrl: string;
  pageCount: number;
  title: string;
}

interface UploadResponse {
  success: boolean;
  postId: string;
  message: string;
}

export default function CarouselCreator() {
  const { toast } = useToast();
  const [step, setStep] = useState<CarouselStep>("input");
  const [aiProvider, setAiProvider] = useState<AIProvider>("auto");
  const [slides, setSlides] = useState<SlideMessage[]>([
    { id: 1, text: "" },
    { id: 2, text: "" },
    { id: 3, text: "" },
  ]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [carouselTitle, setCarouselTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [usedProvider, setUsedProvider] = useState<string>("");
  const [hasCachedImages, setHasCachedImages] = useState(false);

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
      setGeneratedImages(cached.images);
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

  const downloadAllImages = useCallback((images: string[], title: string) => {
    images.forEach((imageUrl, index) => {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${title || "slide"}_${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }, []);

  const generateImagesMutation = useMutation({
    mutationFn: async (messages: string[]): Promise<GenerateImagesResponse> => {
      const response = await apiRequest("POST", "/api/images/generate", { 
        messages,
        provider: aiProvider 
      });
      return response as unknown as GenerateImagesResponse;
    },
    onSuccess: (data) => {
      if (data.imageUrls && data.imageUrls.length > 0) {
        setGeneratedImages(data.imageUrls);
        setCurrentImageIndex(0);
        setUsedProvider(data.provider || "");
        setStep("preview");
        
        saveToLocalStorage(data.imageUrls, carouselTitle);
        setHasCachedImages(false);
        
        downloadAllImages(data.imageUrls, carouselTitle);
        
        const providerName = data.provider === "gemini" ? "Gemini" : data.provider === "openai" ? "OpenAI" : data.provider === "stability" ? "Stability AI" : "AI";
        toast({
          title: "Images Generated & Downloaded!",
          description: `Created ${data.generatedCount} slides using ${providerName}. Images saved to your downloads.`,
        });
      } else {
        toast({
          title: "Error",
          description: "No images were generated",
          variant: "destructive",
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

  const createPdfMutation = useMutation({
    mutationFn: async (imageUrls: string[]): Promise<CreatePdfResponse> => {
      const response = await apiRequest("POST", "/api/pdf/create", { 
        imageUrls, 
        title: carouselTitle || "LinkedIn Carousel" 
      });
      return response as unknown as CreatePdfResponse;
    },
    onSuccess: (data) => {
      if (data.pdfUrl) {
        setPdfDataUrl(data.pdfUrl);
        setStep("review");
        toast({
          title: "PDF Created!",
          description: `Carousel with ${data.pageCount} slides is ready`,
        });
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
      return response as unknown as UploadResponse;
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

  const addSlide = () => {
    if (slides.length < 5) {
      setSlides([...slides, { id: Date.now(), text: "" }]);
    }
  };

  const removeSlide = (id: number) => {
    if (slides.length > 2) {
      setSlides(slides.filter((s) => s.id !== id));
    }
  };

  const updateSlide = (id: number, text: string) => {
    setSlides(slides.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const handleGenerateImages = () => {
    const messages = slides.map((s) => s.text).filter((t) => t.trim());
    if (messages.length < 2) {
      toast({
        title: "Not enough content",
        description: "Please enter at least 2 slides with text",
        variant: "destructive",
      });
      return;
    }
    generateImagesMutation.mutate(messages);
  };

  const handleCreatePdf = () => {
    if (generatedImages.length === 0) {
      toast({
        title: "No images",
        description: "Please generate images first",
        variant: "destructive",
      });
      return;
    }
    createPdfMutation.mutate(generatedImages);
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
    setStep("input");
    setSlides([
      { id: 1, text: "" },
      { id: 2, text: "" },
      { id: 3, text: "" },
    ]);
    setGeneratedImages([]);
    setCurrentImageIndex(0);
    setPdfDataUrl(null);
    setCarouselTitle("");
    setCaption("");
    setUsedProvider("");
    clearLocalStorage();
    setHasCachedImages(false);
  };

  const navigateImage = (direction: "prev" | "next") => {
    if (direction === "prev" && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    } else if (direction === "next" && currentImageIndex < generatedImages.length - 1) {
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

  const isLoading = generateImagesMutation.isPending || createPdfMutation.isPending || uploadToLinkedInMutation.isPending;

  return (
    <Card data-testid="card-carousel-creator">
      <CardHeader className="pb-4">
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
      </CardHeader>

      <CardContent className="space-y-6">
        {step === "input" && (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label htmlFor="ai-provider" className="text-sm font-medium">AI Provider</Label>
                <Select value={aiProvider} onValueChange={(v) => setAiProvider(v as AIProvider)}>
                  <SelectTrigger id="ai-provider" className="border-slate-200" data-testid="select-ai-provider">
                    <SelectValue placeholder="Select AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto" data-testid="select-option-auto">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-blue-600" />
                        Auto (Best Available)
                      </div>
                    </SelectItem>
                    <SelectItem value="gemini" data-testid="select-option-gemini">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        Google Gemini
                      </div>
                    </SelectItem>
                    <SelectItem value="openai" data-testid="select-option-openai">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-green-600" />
                        OpenAI DALL-E
                      </div>
                    </SelectItem>
                    <SelectItem value="stability" data-testid="select-option-stability">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Stability AI
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Slide Messages ({slides.length}/5)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSlide}
                  disabled={slides.length >= 5}
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
                        placeholder={`Slide ${index + 1}: Enter your message...`}
                        value={slide.text}
                        onChange={(e) => updateSlide(slide.id, e.target.value)}
                        className="min-h-20 resize-none"
                        maxLength={500}
                        data-testid={`input-slide-${index}`}
                      />
                    </div>
                    {slides.length > 2 && (
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
                onClick={handleGenerateImages}
                disabled={isLoading || slides.every((s) => !s.text.trim())}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                data-testid="button-generate-images"
              >
                {generateImagesMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
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
                  Preview Your Slides ({generatedImages.length} images)
                </Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep("input")}
                  data-testid="button-back-to-edit"
                >
                  Back to Edit
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {generatedImages.map((img, idx) => (
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
                      src={img}
                      alt={`Slide ${idx + 1}`}
                      className="w-full aspect-square object-cover rounded-md"
                      data-testid={`image-slide-${idx}`}
                    />
                    <p className="text-center text-sm mt-2 font-medium text-muted-foreground">
                      Slide {idx + 1}
                    </p>
                  </div>
                ))}
              </div>

              {generatedImages[currentImageIndex] && (
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block">
                    Selected: Slide {currentImageIndex + 1}
                  </Label>
                  <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={generatedImages[currentImageIndex]}
                      alt={`Slide ${currentImageIndex + 1} - Large Preview`}
                      className="w-full h-full object-cover"
                      data-testid="image-slide-large-preview"
                    />
                    {generatedImages.length > 1 && (
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
                          disabled={currentImageIndex === generatedImages.length - 1}
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
                  onClick={() => downloadAllImages(generatedImages, carouselTitle)}
                  disabled={generatedImages.length === 0}
                  data-testid="button-download-all-images"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download All
                </Button>
              </div>
              <Button
                onClick={handleCreatePdf}
                disabled={isLoading || generatedImages.length === 0}
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
                        {generatedImages.length} slides ready to upload
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

            <div className="flex justify-between">
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
                className="bg-[#0A66C2] hover:bg-[#004182]"
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

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">How it works</p>
              <p className="text-sm text-blue-700/80 leading-relaxed">
                {step === "input" && "Enter your messages for each slide. AI will create professional images."}
                {step === "preview" && "Review the AI-generated images. You can go back and edit if needed."}
                {step === "review" && "Your carousel is ready! Add an optional caption and post to LinkedIn."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
