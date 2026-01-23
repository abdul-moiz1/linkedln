import { useState, useEffect } from "react";
import CarouselHeader from "@/components/CarouselHeader";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { getTemplateById } from "@/services/templatesService";
import CarouselPreview from "@/components/CarouselPreview";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Loader2 } from "lucide-react";

export default function CarouselEditor() {
  const { toast } = useToast();
  const { templateId } = useParams<{ templateId: string }>();
  const [, setLocation] = useLocation();

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [formData, setFormData] = useState<any>({
    authorName: "Jon Snow",
    authorHandle: "@jon-snow",
    slides: [],
  });

  useEffect(() => {
    async function loadTemplate() {
      if (!templateId) return;
      try {
        console.log("CarouselEditor: Detected templateId change. New ID:", templateId);
        setLoading(true);
        
        // CRITICAL: Reset state immediately to prevent stale data display
        setTemplate(null);
        setFormData(null);
        setCurrentSlideIndex(0);

        const data = await getTemplateById(templateId);
        if (data) {
          console.log("CarouselEditor: Successfully fetched template from Firestore:", data.name, "(ID:", data.id, ")");
          setTemplate(data);
          
          const slidesCount = data.slidesCount || 5;
          const defaultSlides = Array.from({ length: slidesCount }, () => ({
            title: "",
            description: ""
          }));

          // TEMPORARILY DISABLED: LocalStorage draft loading to isolate loading bug
          /*
          const saved = localStorage.getItem(`draft_${templateId}`);
          if (saved) {
            // ... loading logic
          }
          */

          console.log("CarouselEditor: Initializing fresh state for template");
          setFormData({
            authorName: data.defaults?.authorName || "Your Name",
            authorHandle: data.defaults?.authorHandle || "@handle",
            slides: defaultSlides
          });
        } else {
          console.error("CarouselEditor: Template document not found in Firestore for ID:", templateId);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Template not found",
          });
          setLocation("/templates");
        }
      } catch (err) {
        console.error("CarouselEditor: Exception during template load:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [templateId, setLocation, toast]);

  const updateCurrentSlide = (field: string, value: string) => {
    setFormData((prev: any) => {
      const newSlides = [...prev.slides];
      newSlides[currentSlideIndex] = {
        ...newSlides[currentSlideIndex],
        [field]: value
      };
      return { ...prev, slides: newSlides };
    });
  };

  const handleSave = () => {
    const saveData = {
      templateId,
      data: formData,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(`draft_${templateId}`, JSON.stringify(saveData));
    toast({
      title: "Saved!",
      description: "Draft saved to local storage."
    });
  };

  const handleContinue = () => {
    toast({
      title: "Success",
      description: "Ready to proceed!"
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500 mb-4" />
        <p className="text-slate-500 font-medium">Loading template editor...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <h1 className="text-2xl font-bold mb-4">Template not found</h1>
        <Button onClick={() => setLocation("/templates")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>
      </div>
    );
  }

  const currentSlide = formData.slides[currentSlideIndex] || { title: "", description: "" };

  return (
    <div className="h-screen bg-[#f8fafc] flex flex-col overflow-hidden text-[#1a1a1a]">
      <CarouselHeader 
        title={template.name}
        lastSaved={new Date().toLocaleTimeString()}
        onSave={handleSave}
        onContinue={handleContinue}
      />
      
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-[1600px] mx-auto">
          {/* Left Panel: Slide List */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex-none">Slides</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 pb-4 custom-scrollbar">
              {formData.slides.map((slide: any, idx: number) => {
                const slideLayouts = template.slideLayouts || [];
                const layoutType = slideLayouts[idx] || (
                  idx === 0 ? 'cover' : 
                  idx === (template.slidesCount - 1) ? 'cta' : 'bullets'
                );
                
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      currentSlideIndex === idx 
                      ? "bg-sky-50 border-sky-200 shadow-sm" 
                      : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold ${currentSlideIndex === idx ? "text-sky-600" : "text-slate-400"}`}>
                        SLIDE {idx + 1} ({layoutType.toUpperCase()})
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {slide.title || "Empty Slide"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle Panel: Content Editor */}
          <div className="lg:col-span-6 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto pr-2 pb-6 custom-scrollbar">
              <Card className="p-6 space-y-6 shadow-sm border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="bg-slate-900 text-white w-6 h-6 rounded flex items-center justify-center text-xs">
                      {currentSlideIndex + 1}
                    </span>
                    Slide Editor
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={currentSlideIndex === 0}
                      onClick={() => setCurrentSlideIndex(prev => prev - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-bold text-slate-500 mx-2">
                      {currentSlideIndex + 1} / {formData.slides.length}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={currentSlideIndex === formData.slides.length - 1}
                      onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Slide Title</Label>
                    <Input 
                      value={currentSlide.title} 
                      onChange={e => updateCurrentSlide("title", e.target.value)}
                      placeholder="Enter slide title or hook..."
                      className="text-lg font-bold py-6"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Slide Description</Label>
                    <Textarea 
                      value={currentSlide.description} 
                      onChange={e => updateCurrentSlide("description", e.target.value)}
                      placeholder="Write your slide content here..."
                      className="min-h-[300px] text-base leading-relaxed resize-none"
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-100 space-y-4">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Brand Information</h3>
                     <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400">Your Name</Label>
                        <Input 
                          value={formData.authorName} 
                          onChange={e => setFormData({...formData, authorName: e.target.value})}
                          size="sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400">Handle</Label>
                        <Input 
                          value={formData.authorHandle} 
                          onChange={e => setFormData({...formData, authorHandle: e.target.value})}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Panel: Live Preview */}
          <div className="lg:col-span-4 flex flex-col min-h-0 items-center">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex-none">Live Preview</h2>
            <div className="w-full overflow-y-auto pb-6 custom-scrollbar">
              <div className="flex justify-center py-2">
                <CarouselPreview 
                  template={template} 
                  data={formData} 
                  currentSlideIndex={currentSlideIndex} 
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
