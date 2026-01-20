import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { CarouselTemplate } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TemplateCard = ({ template }: { template: any }) => {
  const [, setLocation] = useLocation();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use previewImages from Firestore or fallback to thumbnail
  const previewImages = template.previewImages || [];
  const hasSlideshow = previewImages.length > 0;

  useEffect(() => {
    if (isHovered && hasSlideshow) {
      intervalRef.current = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % previewImages.length);
      }, 1500);
    } else {
      setCurrentSlideIndex(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered, hasSlideshow, previewImages.length]);

  return (
    <div 
      className="group cursor-pointer flex flex-col gap-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setLocation(`/carousel-editor?template=${template.templateId}`)}
    >
      <div className="aspect-[4/5] relative rounded-xl overflow-hidden shadow-sm border border-slate-200 group-hover:shadow-md transition-all duration-300 bg-white">
        <img 
          src={hasSlideshow && isHovered ? previewImages[currentSlideIndex] : (template.thumbnailUrl || previewImages[0])} 
          alt={template.title} 
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
        />
        
        {template.isNew && (
          <Badge className="absolute top-2 right-2 bg-[#00a0dc] hover:bg-[#008dbf] text-white border-none text-[10px] px-2 py-0.5 rounded-md font-bold shadow-sm">
            New
          </Badge>
        )}

        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
          <Button size="sm" className="h-8 text-xs font-bold rounded-full px-4 shadow-lg bg-white text-slate-900 hover:bg-slate-50 border-none transition-transform transform translate-y-2 group-hover:translate-y-0">
            Use Template
          </Button>
        </div>
        
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-white/90 backdrop-blur-sm text-slate-900 border-none shadow-sm font-bold px-2 py-0.5 text-[9px] rounded-full">
            {template.slidesCount || 0} slides
          </Badge>
        </div>
      </div>
      
      <div className="px-1 space-y-0.5">
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#00a0dc] transition-colors truncate">
          {template.title}
        </h3>
        <p className="text-[11px] text-slate-400 font-medium">
          {template.category}
        </p>
      </div>
    </div>
  );
};

export default function TemplateGallery() {
  const { data: templates, isLoading } = useQuery<CarouselTemplate[]>({
    queryKey: ["/api/carousel-templates"],
  });
  const [activeTab, setActiveTab] = useState("Templates");

  const categories = ["Basic", "Professional", "Creative", "Elite"];

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[4/5] bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Carousel Maker</h1>
        <p className="text-slate-500 text-sm">Design high-performing LinkedIn carousel posts in minutes.</p>
      </div>

      <div className="flex items-center gap-8 border-b border-slate-200">
        <button 
          className={cn(
            "pb-4 text-sm font-bold transition-all relative",
            activeTab === "Templates" ? "text-[#00a0dc]" : "text-slate-500 hover:text-slate-700"
          )}
          onClick={() => setActiveTab("Templates")}
        >
          Templates
          {activeTab === "Templates" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00a0dc]" />}
        </button>
        <button 
          className={cn(
            "pb-4 text-sm font-bold transition-all relative flex items-center gap-2",
            activeTab === "Saved" ? "text-[#00a0dc]" : "text-slate-500 hover:text-slate-700"
          )}
          onClick={() => setActiveTab("Saved")}
        >
          Saved
          <span className="bg-[#00a0dc] text-white px-1.5 py-0.5 rounded-full text-[10px]">7</span>
          {activeTab === "Saved" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00a0dc]" />}
        </button>
        <button 
          className={cn(
            "pb-4 text-sm font-bold transition-all relative",
            activeTab === "Text to Carousel" ? "text-[#00a0dc]" : "text-slate-500 hover:text-slate-700"
          )}
          onClick={() => setActiveTab("Text to Carousel")}
        >
          Text to Carousel
          {activeTab === "Text to Carousel" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00a0dc]" />}
        </button>
      </div>

      {activeTab === "Templates" && (
        <div className="space-y-12 pb-20">
          {categories.map((cat) => (
            <div key={cat} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900">{cat}</h2>
                <p className="text-sm text-slate-500">
                  {cat === "Basic" ? "For those who want to get started quickly." : 
                   cat === "Professional" ? "Sleek, corporate designs for B2B authority." : 
                   cat === "Creative" ? "Bold, unique layouts to stand out in the feed." :
                   "High-end designs for maximum impact."}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {templates?.filter(t => t.category === cat).map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Saved" && (
        <div className="text-center py-40 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 font-medium">No saved templates found.</p>
        </div>
      )}

      {activeTab === "Text to Carousel" && (
        <div className="text-center py-40 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 font-medium">AI Text to Carousel is coming soon!</p>
        </div>
      )}
    </div>
  );
}
