import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Image as ImageIcon, FileText, Download, Upload, ArrowLeft, Calendar, Layers, ChevronLeft, ChevronRight, Trash2, AlertCircle, RefreshCw, User, Sparkles, Plus, Clock, CheckCircle2, FileImage } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { SessionUser } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CarouselSlide {
  number: number;
  rawText: string;
  finalText: string;
  imagePrompt: string;
  layout: string;
  base64Image?: string;
  imageUrl?: string;
}

interface Carousel {
  id: string;
  userId: string;
  title: string;
  carouselType: string;
  slides: CarouselSlide[];
  pdfBase64?: string;
  pdfUrl?: string;
  status: string;
  createdAt: any;
  updatedAt: any;
}

export default function MyCarousels() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCarousel, setSelectedCarousel] = useState<Carousel | null>(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [deleteCarouselId, setDeleteCarouselId] = useState<string | null>(null);

  const { data: user } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const { data, isLoading, error, refetch } = useQuery<{ carousels: Carousel[] }>({
    queryKey: ["/api/carousels"],
  });

  const generatePdfMutation = useMutation({
    mutationFn: async (carouselId: string) => {
      const response = await apiRequest("POST", `/api/carousel/${carouselId}/create-pdf`);
      return await response.json();
    },
    onSuccess: (data: { pdfBase64?: string; pdfUrl?: string }) => {
      toast({ title: "PDF Generated", description: "Your carousel PDF is ready for download." });
      queryClient.invalidateQueries({ queryKey: ["/api/carousels"] });
      if (selectedCarousel) {
        setSelectedCarousel({ 
          ...selectedCarousel, 
          pdfBase64: data.pdfBase64,
          pdfUrl: data.pdfUrl 
        });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to generate PDF", variant: "destructive" });
    },
  });

  const deleteCarouselMutation = useMutation({
    mutationFn: async (carouselId: string) => {
      return await apiRequest("DELETE", `/api/carousel/${carouselId}`);
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Carousel deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/carousels"] });
      setDeleteCarouselId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete carousel", variant: "destructive" });
    },
  });

  const recoverImagesMutation = useMutation({
    mutationFn: async (carouselId: string) => {
      const response = await apiRequest("POST", `/api/carousel/${carouselId}/recover-images`);
      return await response.json();
    },
    onSuccess: (data: { 
      status?: string; 
      recovered: boolean; 
      recoveredCount?: number; 
      storageImageCount?: number;
      carousel?: Carousel; 
      message?: string;
      success?: boolean;
    }) => {
      switch (data.status) {
        case "recovered":
          toast({ title: "Images Recovered", description: data.message || `Recovered ${data.recoveredCount} images from storage.` });
          queryClient.invalidateQueries({ queryKey: ["/api/carousels"] });
          if (data.carousel) {
            setSelectedCarousel(data.carousel);
            setPreviewSlideIndex(0);
          }
          break;
          
        case "already_has_images":
          toast({ title: "Images Available", description: data.message });
          queryClient.invalidateQueries({ queryKey: ["/api/carousels"] });
          if (data.carousel) {
            setSelectedCarousel(data.carousel);
            setPreviewSlideIndex(0);
          }
          break;
          
        case "no_storage_images":
          toast({ 
            title: "No Images in Storage", 
            description: "No images found in storage to recover. Try generating new images.",
            variant: "destructive" 
          });
          break;
          
        case "storage_error":
          toast({ 
            title: "Storage Error", 
            description: data.message || "Could not access storage. Please try again later.",
            variant: "destructive" 
          });
          break;
          
        default:
          if (data.recovered && data.recoveredCount && data.recoveredCount > 0) {
            toast({ title: "Images Recovered", description: data.message });
            queryClient.invalidateQueries({ queryKey: ["/api/carousels"] });
            if (data.carousel) {
              setSelectedCarousel(data.carousel);
              setPreviewSlideIndex(0);
            }
          } else {
            toast({ 
              title: "Recovery Issue", 
              description: data.message || "Could not recover images.",
              variant: "destructive" 
            });
          }
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to recover images", variant: "destructive" });
    },
  });

  const handleDownloadPdf = (pdfSource: string, title: string) => {
    const link = document.createElement("a");
    link.href = pdfSource;
    link.download = `${title.replace(/\s+/g, "_")}_carousel.pdf`;
    if (pdfSource.startsWith("http")) {
      link.target = "_blank";
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusInfo = (status: string, hasImages: boolean) => {
    if (status === "pdf_created") {
      return { label: "PDF Ready", icon: CheckCircle2, gradient: "from-emerald-500 to-green-600", bgClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" };
    }
    if (status === "images_generated" || hasImages) {
      return { label: "Images Ready", icon: FileImage, gradient: "from-blue-500 to-indigo-600", bgClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400" };
    }
    if (status === "processing") {
      return { label: "Processing", icon: Loader2, gradient: "from-amber-500 to-orange-600", bgClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400" };
    }
    return { label: "Draft", icon: Clock, gradient: "from-slate-400 to-slate-500", bgClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400" };
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "Unknown";
    try {
      if (dateValue._seconds) {
        return format(new Date(dateValue._seconds * 1000), "MMM d, yyyy");
      }
      return format(new Date(dateValue), "MMM d, yyyy");
    } catch {
      return "Unknown";
    }
  };

  const carousels = data?.carousels || [];
  const slidesWithImages = selectedCarousel?.slides.filter(s => s.base64Image || s.imageUrl) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950" data-testid="loading-carousels">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading your carousels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 gap-6 px-4" data-testid="error-carousels">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
          <AlertCircle className="h-10 w-10 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Unable to Load Carousels</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Please log in to view your carousels.</p>
        </div>
        <Button 
          onClick={() => navigate("/login")} 
          size="lg"
          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
          data-testid="button-login"
        >
          <User className="h-4 w-4" />
          Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-10 dark:opacity-5" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-10 dark:opacity-5" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/")} 
              className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">My Carousels</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">{carousels.length} carousel{carousels.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => refetch()}
              className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              data-testid="button-refresh-carousels"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300" data-testid="text-current-user">
                <User className="h-4 w-4" />
                <span className="max-w-[150px] truncate">{user.profile?.email || user.profile?.sub}</span>
              </div>
            )}
            <Button 
              onClick={() => navigate("/create")}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 rounded-xl"
              data-testid="button-create-new"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Carousel</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container relative py-8 px-4">
        {carousels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6" data-testid="empty-carousels">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No carousels yet</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Create your first LinkedIn carousel and watch your engagement soar. It only takes a few minutes!
              </p>
            </div>
            <Button 
              onClick={() => navigate("/create")} 
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/25 px-8"
              data-testid="button-create-first"
            >
              <Sparkles className="w-5 h-5" />
              Create Your First Carousel
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {carousels.map((carousel) => {
              const hasImages = carousel.slides.some(s => s.base64Image || s.imageUrl);
              const firstImageSlide = carousel.slides.find(s => s.base64Image || s.imageUrl);
              const firstImageSrc = firstImageSlide?.base64Image || firstImageSlide?.imageUrl;
              const statusInfo = getStatusInfo(carousel.status, hasImages);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Card 
                  key={carousel.id} 
                  className="group overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer bg-white dark:bg-slate-900"
                  onClick={() => {
                    setSelectedCarousel(carousel);
                    setPreviewSlideIndex(0);
                  }}
                  data-testid={`card-carousel-${carousel.id}`}
                >
                  {/* Image Preview */}
                  <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 relative overflow-hidden">
                    {firstImageSrc ? (
                      <img 
                        src={firstImageSrc} 
                        alt={carousel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-white" />
                        </div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">No preview</span>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge className={`gap-1.5 px-2.5 py-1 font-medium border-0 ${statusInfo.bgClass}`}>
                        <StatusIcon className={`h-3 w-3 ${statusInfo.label === 'Processing' ? 'animate-spin' : ''}`} />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    
                    {/* Slide Count */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                      <Layers className="h-3.5 w-3.5" />
                      {carousel.slides.length} slides
                    </div>
                    
                    {/* Delete Button (visible on hover) */}
                    <Button 
                      variant="secondary"
                      size="icon"
                      className="absolute top-3 left-3 h-8 w-8 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCarouselId(carousel.id);
                      }}
                      data-testid={`button-delete-${carousel.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  
                  {/* Card Content */}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" data-testid={`text-title-${carousel.id}`}>
                      {carousel.title}
                    </h3>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(carousel.updatedAt)}
                      </div>
                      <Badge variant="outline" className="text-xs font-normal capitalize">
                        {carousel.carouselType?.replace('_', ' ') || 'Custom'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!selectedCarousel} onOpenChange={() => setSelectedCarousel(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-slate-900">
          <DialogHeader className="pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white" data-testid="text-preview-title">
                  {selectedCarousel?.title}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="capitalize">
                    {selectedCarousel?.carouselType?.replace('_', ' ') || 'Custom'}
                  </Badge>
                  <span className="text-slate-400">-</span>
                  <span>{selectedCarousel?.slides.length} slides</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedCarousel && (
            <div className="flex-1 overflow-hidden flex flex-col gap-4 pt-4">
              {slidesWithImages.length > 0 ? (
                <>
                  {/* Main Preview */}
                  <div className="relative aspect-square max-h-[50vh] mx-auto w-full max-w-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl overflow-hidden shadow-lg">
                    <img 
                      src={slidesWithImages[previewSlideIndex]?.base64Image || slidesWithImages[previewSlideIndex]?.imageUrl}
                      alt={`Slide ${previewSlideIndex + 1}`}
                      className="w-full h-full object-contain"
                      data-testid="img-preview-slide"
                    />
                    
                    {slidesWithImages.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg"
                          onClick={() => setPreviewSlideIndex(i => Math.max(0, i - 1))}
                          disabled={previewSlideIndex === 0}
                          data-testid="button-prev-slide"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg"
                          onClick={() => setPreviewSlideIndex(i => Math.min(slidesWithImages.length - 1, i + 1))}
                          disabled={previewSlideIndex === slidesWithImages.length - 1}
                          data-testid="button-next-slide"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </>
                    )}
                    
                    {/* Slide Counter */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-lg">
                      {previewSlideIndex + 1} / {slidesWithImages.length}
                    </div>
                  </div>

                  {/* Thumbnail Strip */}
                  <ScrollArea className="flex-shrink-0">
                    <div className="flex gap-2 pb-2 justify-center">
                      {slidesWithImages.map((slide, index) => (
                        <button
                          key={slide.number}
                          onClick={() => setPreviewSlideIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                            index === previewSlideIndex 
                              ? "border-blue-500 shadow-lg shadow-blue-500/25 scale-105" 
                              : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                          data-testid={`button-thumbnail-${index}`}
                        >
                          <img 
                            src={slide.base64Image || slide.imageUrl}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-center flex-wrap pt-2">
                    {!(selectedCarousel.pdfBase64 || selectedCarousel.pdfUrl) ? (
                      <Button
                        onClick={() => generatePdfMutation.mutate(selectedCarousel.id)}
                        disabled={generatePdfMutation.isPending}
                        className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                        data-testid="button-generate-pdf"
                      >
                        {generatePdfMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating PDF...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4" />
                            Generate PDF
                          </>
                        )}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleDownloadPdf(selectedCarousel.pdfBase64 || selectedCarousel.pdfUrl!, selectedCarousel.title)}
                          className="gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-500/25"
                          data-testid="button-download-pdf"
                        >
                          <Download className="h-4 w-4" />
                          Download PDF
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            toast({ 
                              title: "Coming Soon", 
                              description: "LinkedIn upload feature will be available soon." 
                            });
                          }}
                          data-testid="button-upload-linkedin"
                        >
                          <Upload className="h-4 w-4" />
                          Upload to LinkedIn
                        </Button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Images Yet</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-sm">
                      Generate images for this carousel to see the preview.
                    </p>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center">
                    {(selectedCarousel.pdfBase64 || selectedCarousel.pdfUrl) && (
                      <Button 
                        variant="outline"
                        onClick={() => recoverImagesMutation.mutate(selectedCarousel.id)}
                        disabled={recoverImagesMutation.isPending}
                        className="gap-2"
                        data-testid="button-recover-images"
                      >
                        {recoverImagesMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Recovering...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Recover Images
                          </>
                        )}
                      </Button>
                    )}
                    <Button 
                      onClick={() => {
                        setSelectedCarousel(null);
                        navigate(`/preview?carouselId=${selectedCarousel.id}`);
                      }}
                      className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                      data-testid="button-generate-images"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Images
                    </Button>
                  </div>
                  {(selectedCarousel.pdfBase64 || selectedCarousel.pdfUrl) && (
                    <Button
                      variant="ghost"
                      onClick={() => handleDownloadPdf(selectedCarousel.pdfBase64 || selectedCarousel.pdfUrl!, selectedCarousel.title)}
                      className="gap-2 text-slate-600 dark:text-slate-400"
                      data-testid="button-download-pdf-no-images"
                    >
                      <Download className="h-4 w-4" />
                      Download Existing PDF
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCarouselId} onOpenChange={() => setDeleteCarouselId(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle className="text-xl">Delete Carousel?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              This action cannot be undone. This will permanently delete your carousel and all its generated images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl" data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCarouselId && deleteCarouselMutation.mutate(deleteCarouselId)}
              className="gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl"
              data-testid="button-confirm-delete"
            >
              {deleteCarouselMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
