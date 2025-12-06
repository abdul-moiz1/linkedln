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
    // Try in-memory store first (has full images from same-session navigation)
    const memoryData = getCarouselData();
    if (memoryData) {
      const hasImages = memoryData.processedSlides?.some(slide => slide.base64Image);
      if (hasImages) {
        setDraft(memoryData as CarouselDraft);
        setCaption(memoryData.title ? `Check out my ${memoryData.title}!` : "");
        return;
      }
    }
    
    // Fall back to localStorage (might not have images after page refresh)
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
    if (!pdfBase64) {
      setIsCreatingPdf(true);
      await createPdfMutation.mutateAsync();
      setIsCreatingPdf(false);
    }
    
    const pdfToDownload = pdfBase64 || createPdfMutation.data?.pdfBase64;
    if (pdfToDownload) {
      const link = document.createElement("a");
      link.href = pdfToDownload;
      link.download = `${draft?.title || "carousel"}.pdf`;
      link.click();
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
    <div className="min-h-screen bg-slate-100">
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
                  <p className="font-semibold text-slate-900">{userName}</p>
                  <p className="text-sm text-slate-500">Just now</p>
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
                  className="resize-none border-0 focus-visible:ring-0 text-slate-800 bg-transparent"
                  rows={3}
                  data-testid="textarea-caption"
                />
              </div>
            </div>

            <div className="relative bg-slate-900">
              {/* Slide Number Indicator - Top Right */}
              <div className="absolute top-3 right-3 z-10 bg-black/60 text-white px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                {currentSlideIndex + 1} / {slidesWithImages.length}
              </div>

              {/* LinkedIn Carousel Aspect Ratio: 4:5 (portrait) */}
              <div className="aspect-[4/5]">
                {currentSlide?.base64Image ? (
                  <img
                    src={currentSlide.base64Image}
                    alt={`Slide ${currentSlideIndex + 1}`}
                    className="w-full h-full object-cover rounded-sm"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    No image available
                  </div>
                )}
              </div>

              {slidesWithImages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                    disabled={currentSlideIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center disabled:opacity-30 hover:bg-white transition-colors"
                    data-testid="button-prev-slide"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-700" />
                  </button>
                  <button
                    onClick={() => setCurrentSlideIndex(Math.min(slidesWithImages.length - 1, currentSlideIndex + 1))}
                    disabled={currentSlideIndex === slidesWithImages.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center disabled:opacity-30 hover:bg-white transition-colors"
                    data-testid="button-next-slide"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {slidesWithImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentSlideIndex 
                            ? "bg-white w-4" 
                            : "bg-white/50 hover:bg-white/70"
                        }`}
                        data-testid={`button-dot-${idx}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="px-4 py-2 border-b text-sm text-slate-500">
              {currentSlideIndex + 1} of {slidesWithImages.length}
            </div>

            <div className="flex items-center justify-around py-2 border-b text-slate-500">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                <ThumbsUp className="w-5 h-5" />
                <span className="text-sm font-medium">Like</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Comment</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Repeat2 className="w-5 h-5" />
                <span className="text-sm font-medium">Repost</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Send className="w-5 h-5" />
                <span className="text-sm font-medium">Send</span>
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-3">
          {!user || user.authProvider !== 'linkedin' ? (
            <Card className="p-4">
              <div className="text-center space-y-4">
                <p className="text-slate-600">
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
