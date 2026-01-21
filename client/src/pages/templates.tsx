import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { CarouselTemplate } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";


const TemplateCard = ({ template }: { template: any }) => {
  const [, setLocation] = useLocation();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use preview.hoverSlides from Firestore or fallback to previewImages/thumbnail
  const hoverSlides = template.preview?.hoverSlides || template.previewImages || [];
  const coverImage = template.preview?.coverImage || template.thumbnailUrl || hoverSlides[0];
  const hasSlideshow = hoverSlides.length > 0;

  useEffect(() => {
    if (isHovered && hasSlideshow) {
      intervalRef.current = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % hoverSlides.length);
      }, 800); // Slightly slower for better readability
    } else {
      setCurrentSlideIndex(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered, hasSlideshow, hoverSlides.length]);

  return (
    <div 
      className="group cursor-pointer flex flex-col gap-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setLocation(`/carousel-editor?template=${template.templateId}`)}
    >
      <div className="aspect-[4/5] relative rounded-2xl overflow-hidden shadow-md border border-slate-200 group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500 bg-white">
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
          <img 
            src={hasSlideshow && isHovered ? hoverSlides[currentSlideIndex] : coverImage} 
            alt={template.title} 
            key={hasSlideshow && isHovered ? currentSlideIndex : 'cover'}
            className="object-cover w-full h-full transition-opacity duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=400&q=80";
            }}
          />
          
          {/* Design Overlay to mimic LinkedIn Post appearance */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
          
          <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 border border-white/20 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${template.templateId}`} alt="avatar" className="w-full h-full" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-white leading-none">Jon Snow</span>
                <span className="text-[7px] text-white/70 leading-none">LinkedIn Creator</span>
              </div>
            </div>
            <h4 className="text-white text-xs font-bold leading-tight line-clamp-2">
              {template.slides?.[isHovered ? currentSlideIndex : 0]?.placeholder?.title || template.title}
            </h4>
          </div>
        </div>
        
        {template.isNew && (
          <Badge className="absolute top-4 right-4 bg-sky-500 hover:bg-sky-600 text-white border-none text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg z-30">
            New
          </Badge>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-20" />

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center p-2 z-40">
          <Button size="sm" className="h-10 text-xs font-bold rounded-full px-6 shadow-2xl bg-white text-slate-900 hover:bg-slate-50 border-none transition-transform transform scale-90 group-hover:scale-100">
            Use Template
          </Button>
        </div>
        
        <div className="absolute top-4 left-4 z-30">
          <Badge className="bg-white/90 backdrop-blur-md text-slate-900 border-none shadow-lg font-bold px-2 py-1 text-[10px] rounded-full">
            {template.slidesCount || 0} slides
          </Badge>
        </div>
      </div>
      
      <div className="px-1 space-y-0.5">
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
          {template.title}
        </h3>
      </div>
    </div>
  );
};

export default function TemplateGallery() {
  const { data: allTemplates, isLoading } = useQuery<CarouselTemplate[]>({
    queryKey: ["/api/carousel-templates"],
  });
  
  // Filter for Basic category only as per requirements
  const templates = allTemplates?.filter(t => t.category === "Basic");
  

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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
        {templates?.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );
}
