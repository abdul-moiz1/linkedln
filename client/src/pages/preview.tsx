import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SiLinkedin } from "react-icons/si";
import { 
  ChevronLeft, 
  ChevronRight,
  Globe,
  ThumbsUp,
  MessageCircle,
  Repeat2,
  Send,
  Edit,
  Download,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getCarouselData, clearCarouselData } from "@/lib/carouselStore";
import Header from "@/components/Header";
import type { SessionUser } from "@shared/schema";

const DRAFT_STORAGE_KEY = "carousel_draft";

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
  aiProvider: string;
  slides: any[];
  processedSlides: ProcessedSlide[];
  step: string;
  savedAt: number;
}

export default function Preview() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [draft, setDraft] = useState<CarouselDraft | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [isCreatingPdf, setIsCreatingPdf] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const { data: user, isLoading: isLoadingUser } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
  });

  useEffect(() => {
    const memoryData = getCarouselData();
    if (memoryData) {
      const hasImages = memoryData.processedSlides?.some(slide => slide.base64Image);
      if (hasImages) {
        setDraft(memoryData as CarouselDraft);
        setCaption(memoryData.title ? `Check out my ${memoryData.title}!` : "");
        return;
      }
    }
    
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed: CarouselDraft = JSON.parse(savedDraft);
        const hasImages = parsed.processedSlides?.some(slide => slide.base64Image);
        if (!hasImages) {
          toast({
            title: "Images Missing",
            description: "Please go back and regenerate your images",
            variant: "destructive",
          });
          navigate("/create");
          return;
        }
        setDraft(parsed);
        setCaption(parsed.title ? `Check out my ${parsed.title}!` : "");
      } catch {
        toast({
          title: "Error",
          description: "Could not load your carousel",
          variant: "destructive",
        });
        navigate("/create");
      }
    } else {
      toast({
        title: "No Carousel Found",
        description: "Please create a carousel first",
        variant: "destructive",
      });
      navigate("/create");
    }
  }, []);

  const createPdfMutation = useMutation({
    mutationFn: async () => {
      if (!draft) return null;
      const imageArray = draft.processedSlides
        .filter(s => s.base64Image)
        .map(s => s.base64Image!);
      
      const response = await apiRequest("POST", "/api/pdf/create", { 
        images: imageArray,
        title: draft.title || "LinkedIn Carousel"
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data?.pdfBase64) {
        setPdfBase64(data.pdfBase64);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create PDF",
        variant: "destructive",
      });
    },
  });

  const uploadToLinkedInMutation = useMutation({
    mutationFn: async () => {
      if (!pdfBase64) {
        await createPdfMutation.mutateAsync();
      }
      
      const pdfToUpload = pdfBase64 || createPdfMutation.data?.pdfBase64;
      if (!pdfToUpload) {
        throw new Error("No PDF available");
      }

      const response = await apiRequest("POST", "/api/linkedin/upload", {
        pdfBase64: pdfToUpload,
        caption,
        title: draft?.title || "My Carousel",
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your carousel has been posted to LinkedIn",
      });
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      clearCarouselData();
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post to LinkedIn",
        variant: "destructive",
      });
    },
  });

  const handleLinkedInLogin = () => {
    window.location.href = "/auth/linkedin";
  };

  const handleDownloadPdf = async () => {
    try {
      setIsCreatingPdf(true);
      
      let pdfDataUrl = pdfBase64;
      if (!pdfDataUrl) {
        const result = await createPdfMutation.mutateAsync();
        pdfDataUrl = result?.pdfBase64;
      }
      
      if (pdfDataUrl) {
        const base64Data = pdfDataUrl.includes(",") 
          ? pdfDataUrl.split(",")[1] 
          : pdfDataUrl;
        
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
        link.download = `${draft?.title || "carousel"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        
        toast({
          title: "Downloaded!",
          description: "Your PDF carousel has been downloaded",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPdf(false);
    }
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
  };

  const handleNextSlide = () => {
    if (draft) {
      const slidesWithImages = draft.processedSlides.filter(s => s.base64Image);
      setCurrentSlideIndex(Math.min(slidesWithImages.length - 1, currentSlideIndex + 1));
    }
  };

  if (!draft || draft.processedSlides.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const slidesWithImages = draft.processedSlides.filter(s => s.base64Image);
  const currentSlide = slidesWithImages[currentSlideIndex];
  
  const profile = user?.profile;
  const userName = profile?.name || "Your Name";
  const userPicture = profile?.picture;
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <Header variant="app" />
      
      <main className="container mx-auto max-w-2xl py-8 px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/create")} data-testid="button-back-to-edit">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Button>
        </div>

        <Card className="overflow-hidden shadow-lg">
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={userPicture} alt={userName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{userName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Just now</p>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                    <Globe className="w-3 h-3" />
                    <span>Anyone</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3">
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption for your carousel..."
                  className="resize-none border-0 focus-visible:ring-0 text-slate-800 dark:text-slate-200 bg-transparent"
                  rows={3}
                  data-testid="textarea-caption"
                />
              </div>
            </div>

            {/* LinkedIn-style Carousel Title Header */}
            <div className="bg-slate-800 dark:bg-slate-950 px-4 py-2.5 text-white">
              <p className="text-sm font-medium truncate">
                {draft.title || "LinkedIn Carousel"} <span className="text-slate-400 font-normal">· {slidesWithImages.length} pages</span>
              </p>
            </div>

            {/* LinkedIn-style Carousel Viewer with Hover Navigation */}
            <div className="relative bg-slate-900 group">
              {/* LinkedIn Carousel Aspect Ratio: 4:5 (portrait) */}
              <div className="aspect-[4/5]">
                {currentSlide?.base64Image ? (
                  <img
                    src={currentSlide.base64Image}
                    alt={`Slide ${currentSlideIndex + 1}`}
                    className="w-full h-full object-cover"
                    data-testid={`img-slide-${currentSlideIndex}`}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    No image available
                  </div>
                )}
              </div>

              {/* Navigation Arrows - Hidden until hover (LinkedIn style) */}
              {slidesWithImages.length > 1 && (
                <>
                  {/* Previous Arrow */}
                  <button
                    onClick={handlePrevSlide}
                    disabled={currentSlideIndex === 0}
                    className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-start pl-2 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      disabled:pointer-events-none"
                    data-testid="button-prev-slide"
                  >
                    <div className={`w-9 h-9 rounded-full bg-white/90 shadow-lg flex items-center justify-center transition-all
                      ${currentSlideIndex === 0 ? 'opacity-30' : 'hover:bg-white hover:scale-105'}`}>
                      <ChevronLeft className="w-5 h-5 text-slate-700" />
                    </div>
                  </button>

                  {/* Next Arrow */}
                  <button
                    onClick={handleNextSlide}
                    disabled={currentSlideIndex === slidesWithImages.length - 1}
                    className="absolute right-0 top-0 bottom-0 w-16 flex items-center justify-end pr-2
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      disabled:pointer-events-none"
                    data-testid="button-next-slide"
                  >
                    <div className={`w-9 h-9 rounded-full bg-white/90 shadow-lg flex items-center justify-center transition-all
                      ${currentSlideIndex === slidesWithImages.length - 1 ? 'opacity-30' : 'hover:bg-white hover:scale-105'}`}>
                      <ChevronRight className="w-5 h-5 text-slate-700" />
                    </div>
                  </button>
                </>
              )}

              {/* Slide Counter - Bottom Left (LinkedIn style) */}
              <div className="absolute bottom-3 left-3 z-10 bg-black/70 text-white px-2.5 py-1 rounded text-xs font-medium backdrop-blur-sm flex items-center gap-1.5">
                <span>{currentSlideIndex + 1} / {slidesWithImages.length}</span>
                {/* Progress dots */}
                <div className="flex gap-0.5 ml-1">
                  {slidesWithImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1 h-1 rounded-full transition-colors ${
                        idx === currentSlideIndex ? "bg-white" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Fullscreen icon hint - Bottom Right (LinkedIn style) */}
              <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/70 text-white p-1.5 rounded backdrop-blur-sm">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M3 16v3a2 2 0 002 2h3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* LinkedIn-style Social Actions Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <button 
                  className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
                  data-testid="button-like"
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-sm">Like</span>
                </button>
                <button 
                  className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
                  data-testid="button-comment"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">Comment</span>
                </button>
                <button 
                  className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
                  data-testid="button-repost"
                >
                  <Repeat2 className="w-5 h-5" />
                  <span className="text-sm">Repost</span>
                </button>
                <button 
                  className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
                  data-testid="button-send"
                >
                  <Send className="w-5 h-5" />
                  <span className="text-sm">Send</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-3">
          {!user || user.authProvider !== 'linkedin' ? (
            <Card className="p-4">
              <div className="text-center space-y-4">
                <p className="text-slate-600 dark:text-slate-400">
                  {user ? "Connect your LinkedIn account to post this carousel" : "Sign in and connect LinkedIn to post this carousel"}
                </p>
                <Button 
                  onClick={handleLinkedInLogin}
                  className="gap-2 bg-[#0A66C2] hover:bg-[#004182]"
                  data-testid="button-connect-linkedin"
                >
                  <SiLinkedin className="w-4 h-4" />
                  Connect LinkedIn
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              onClick={() => uploadToLinkedInMutation.mutate()}
              disabled={uploadToLinkedInMutation.isPending || createPdfMutation.isPending}
              className="w-full gap-2 bg-[#0A66C2] hover:bg-[#004182]"
              size="lg"
              data-testid="button-post-linkedin"
            >
              {(uploadToLinkedInMutation.isPending || createPdfMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SiLinkedin className="w-4 h-4" />
              )}
              Post to LinkedIn
            </Button>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/create")}
              className="flex-1 gap-2"
              data-testid="button-edit-carousel"
            >
              <Edit className="w-4 h-4" />
              Edit Carousel
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={isCreatingPdf || createPdfMutation.isPending}
              className="flex-1 gap-2"
              data-testid="button-download-pdf"
            >
              {(isCreatingPdf || createPdfMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
