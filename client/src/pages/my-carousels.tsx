import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Image as ImageIcon, FileText, Download, Upload, ArrowLeft, Calendar, Layers, ChevronLeft, ChevronRight, Trash2, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
}

interface Carousel {
  id: string;
  userId: string;
  title: string;
  carouselType: string;
  slides: CarouselSlide[];
  pdfBase64?: string;
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

  const { data, isLoading, error } = useQuery<{ carousels: Carousel[] }>({
    queryKey: ["/api/carousels"],
  });

  const generatePdfMutation = useMutation({
    mutationFn: async (carouselId: string) => {
      const response = await apiRequest("POST", `/api/carousel/${carouselId}/create-pdf`);
      return await response.json();
    },
    onSuccess: (data: { pdfBase64: string }) => {
      toast({ title: "PDF Generated", description: "Your carousel PDF is ready for download." });
      queryClient.invalidateQueries({ queryKey: ["/api/carousels"] });
      if (selectedCarousel) {
        setSelectedCarousel({ ...selectedCarousel, pdfBase64: data.pdfBase64 });
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

  const handleDownloadPdf = (pdfBase64: string, title: string) => {
    const link = document.createElement("a");
    link.href = pdfBase64;
    link.download = `${title.replace(/\s+/g, "_")}_carousel.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string, hasImages: boolean) => {
    if (status === "pdf_created") {
      return <Badge variant="default" className="bg-green-600">PDF Ready</Badge>;
    }
    if (status === "images_generated" || hasImages) {
      return <Badge variant="default" className="bg-blue-600">Images Ready</Badge>;
    }
    if (status === "processing") {
      return <Badge variant="secondary">Processing</Badge>;
    }
    return <Badge variant="outline">Draft</Badge>;
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
  const slidesWithImages = selectedCarousel?.slides.filter(s => s.base64Image) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-carousels">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4" data-testid="error-carousels">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load carousels. Please try again.</p>
        <Button onClick={() => navigate("/login")} data-testid="button-login">
          Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back-home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">My Carousels</h1>
        </div>
      </header>

      <main className="container py-8">
        {carousels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4" data-testid="empty-carousels">
            <Layers className="h-16 w-16 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold text-muted-foreground">No carousels yet</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Create your first LinkedIn carousel to see it here.
            </p>
            <Button onClick={() => navigate("/create")} data-testid="button-create-first">
              Create Carousel
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {carousels.map((carousel) => {
              const hasImages = carousel.slides.some(s => s.base64Image);
              const firstImageSlide = carousel.slides.find(s => s.base64Image);
              
              return (
                <Card 
                  key={carousel.id} 
                  className="overflow-hidden hover-elevate cursor-pointer group"
                  onClick={() => {
                    setSelectedCarousel(carousel);
                    setPreviewSlideIndex(0);
                  }}
                  data-testid={`card-carousel-${carousel.id}`}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {firstImageSlide?.base64Image ? (
                      <img 
                        src={firstImageSlide.base64Image} 
                        alt={carousel.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(carousel.status, hasImages)}
                    </div>
                    <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {carousel.slides.length} slides
                    </div>
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base line-clamp-1" data-testid={`text-title-${carousel.id}`}>
                      {carousel.title}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="p-4 pt-0 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(carousel.updatedAt)}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCarouselId(carousel.id);
                      }}
                      data-testid={`button-delete-${carousel.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!selectedCarousel} onOpenChange={() => setSelectedCarousel(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle data-testid="text-preview-title">{selectedCarousel?.title}</DialogTitle>
            <DialogDescription>
              {selectedCarousel?.carouselType} - {selectedCarousel?.slides.length} slides
            </DialogDescription>
          </DialogHeader>
          
          {selectedCarousel && (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              {slidesWithImages.length > 0 ? (
                <>
                  <div className="relative aspect-square max-h-[50vh] mx-auto w-full max-w-lg bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={slidesWithImages[previewSlideIndex]?.base64Image}
                      alt={`Slide ${previewSlideIndex + 1}`}
                      className="w-full h-full object-contain"
                      data-testid="img-preview-slide"
                    />
                    
                    {slidesWithImages.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2"
                          onClick={() => setPreviewSlideIndex(i => Math.max(0, i - 1))}
                          disabled={previewSlideIndex === 0}
                          data-testid="button-prev-slide"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setPreviewSlideIndex(i => Math.min(slidesWithImages.length - 1, i + 1))}
                          disabled={previewSlideIndex === slidesWithImages.length - 1}
                          data-testid="button-next-slide"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
                      {previewSlideIndex + 1} / {slidesWithImages.length}
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="flex gap-2 pb-2">
                      {slidesWithImages.map((slide, index) => (
                        <button
                          key={slide.number}
                          onClick={() => setPreviewSlideIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                            index === previewSlideIndex ? "border-primary" : "border-transparent"
                          }`}
                          data-testid={`button-thumbnail-${index}`}
                        >
                          <img 
                            src={slide.base64Image}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2 justify-center flex-wrap">
                    {!selectedCarousel.pdfBase64 ? (
                      <Button
                        onClick={() => generatePdfMutation.mutate(selectedCarousel.id)}
                        disabled={generatePdfMutation.isPending}
                        data-testid="button-generate-pdf"
                      >
                        {generatePdfMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating PDF...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate PDF
                          </>
                        )}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleDownloadPdf(selectedCarousel.pdfBase64!, selectedCarousel.title)}
                          data-testid="button-download-pdf"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            toast({ 
                              title: "Coming Soon", 
                              description: "LinkedIn upload feature will be available soon." 
                            });
                          }}
                          data-testid="button-upload-linkedin"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload to LinkedIn
                        </Button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-center">
                    No images generated yet for this carousel.
                  </p>
                  <Button 
                    onClick={() => {
                      setSelectedCarousel(null);
                      navigate(`/preview?carouselId=${selectedCarousel.id}`);
                    }}
                    data-testid="button-generate-images"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Generate Images
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCarouselId} onOpenChange={() => setDeleteCarouselId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Carousel?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your carousel and all its generated images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCarouselId && deleteCarouselMutation.mutate(deleteCarouselId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteCarouselMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
