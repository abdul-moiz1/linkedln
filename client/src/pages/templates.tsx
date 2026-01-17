import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CarouselTemplate } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TemplateCard = ({ template }: { template: CarouselTemplate }) => {
  const [, setLocation] = useLocation();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const previewSlides = template.previewSlides ? JSON.parse(template.previewSlides) : [];
  const hasSlideshow = previewSlides.length > 0;

  useEffect(() => {
    if (isHovered && hasSlideshow) {
      // Short delay before starting slideshow
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
    <Card 
      className="overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer bg-white rounded-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setLocation("/carousel-editor")}
    >
      <div className="aspect-[4/5] relative overflow-hidden bg-slate-100">
        <div className="absolute inset-0 transition-opacity duration-500">
          <img 
            src={hasSlideshow ? previewSlides[currentSlideIndex] : template.thumbnailUrl} 
            alt={template.name} 
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-white/90 hover:bg-white text-[#1a1a1a] border-none shadow-sm font-bold px-2 py-0.5 text-[10px] rounded-full">
            {template.slideCount} slides
          </Badge>
        </div>

        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
           <Button variant="secondary" className="font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 rounded-full px-6">
             Use Template
           </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-1">
        <h3 className="font-bold text-[#1a1a1a] text-lg leading-tight group-hover:text-[#00a0dc] transition-colors">
          {template.name}
        </h3>
        <p className="text-sm text-slate-400 font-medium">
          {template.category}
        </p>
      </div>
    </Card>
  );
};

export default function TemplateGallery() {
  const { data: templates, isLoading } = useQuery<CarouselTemplate[]>({
    queryKey: ["/api/carousel-templates"],
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[4/5] bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-[#1a1a1a] tracking-tight">Carousel Templates</h1>
        <p className="text-slate-500 text-lg">Choose a professional template to get started.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {templates?.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );
}
