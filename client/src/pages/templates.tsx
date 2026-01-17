import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CarouselTemplate, UserCarousel } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TemplateCard = ({ template }: { template: CarouselTemplate }) => {
  const [, setLocation] = useLocation();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const previewSlides = template.previewSlides ? JSON.parse(template.previewSlides) : [];
  const hasSlideshow = previewSlides.length > 0;

  useEffect(() => {
    if (isHovered && hasSlideshow) {
      const delayTimeout = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          setCurrentSlideIndex((prev) => (prev + 1) % previewSlides.length);
        }, 1000);
      }, 400);

      return () => {
        clearTimeout(delayTimeout);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setCurrentSlideIndex(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isHovered, hasSlideshow, previewSlides.length]);

  return (
    <div 
      className="relative group cursor-pointer transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setLocation("/carousel-editor")}
    >
      <div className="aspect-[4/5] relative overflow-hidden bg-slate-100 rounded-2xl border border-slate-200">
        <div className="absolute inset-0 transition-opacity duration-500">
          <img 
            src={hasSlideshow ? previewSlides[currentSlideIndex] : template.thumbnailUrl} 
            alt={template.name} 
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-[#00a0dc] hover:bg-[#00a0dc] text-white border-none shadow-sm font-bold px-3 py-1 text-[12px] rounded-xl">
            New
          </Badge>
        </div>

        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
           <Button variant="secondary" className="font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 rounded-full px-6 bg-white text-black hover:bg-slate-100">
             Use Template
           </Button>
        </div>
      </div>
    </div>
  );
};

export default function TemplateGallery() {
  const [location, setLocation] = useLocation();
  const { data: templates, isLoading } = useQuery<CarouselTemplate[]>({
    queryKey: ["/api/carousel-templates"],
  });
  
  const { data: userCarousels } = useQuery<UserCarousel[]>({
    queryKey: ["/api/user-carousels"],
  });

  const savedCount = userCarousels?.length || 0;

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-20 bg-slate-100 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[4/5] bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Group templates by category
  const categories = templates ? Array.from(new Set(templates.map(t => t.category))) : [];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-12 bg-white min-h-screen">
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-[#1a1a1a]">Carousel Maker</h1>
          <p className="text-slate-500 text-lg">Design high-performing LinkedIn carousel posts in minutes.</p>
        </div>

        <div className="flex border-b border-slate-200">
          <div className="flex gap-8">
            <button 
              onClick={() => setLocation("/templates")}
              className={cn(
                "pb-4 text-lg font-semibold transition-colors relative",
                location === "/templates" ? "text-[#00a0dc]" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Templates
              {location === "/templates" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#00a0dc] rounded-t-full" />}
            </button>
            <button 
              onClick={() => setLocation("/my-carousels")}
              className={cn(
                "pb-4 text-lg font-semibold transition-colors flex items-center gap-2",
                location === "/my-carousels" ? "text-[#00a0dc]" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Saved
              <span className="bg-[#00a0dc] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {savedCount}
              </span>
            </button>
            <button 
              onClick={() => setLocation("/create")}
              className="pb-4 text-lg font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Text to Carousel
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {categories.map(category => (
          <div key={category} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-[#1a1a1a]">{category}</h2>
              <p className="text-slate-500">For those who want to get started quickly.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {templates?.filter(t => t.category === category).map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
