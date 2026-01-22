import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCarouselTemplates } from "@/services/templatesService";

const TemplateCard = ({ template }: { template: any }) => {
  const [, setLocation] = useLocation();
  const thumbnail = template.thumbnail || (template.preview?.coverImage) || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=400&q=80";

  return (
    <div 
      className="group cursor-pointer flex flex-col gap-3"
      onClick={() => setLocation(`/carousel-editor/${template.id}`)}
    >
      <div className="aspect-[4/5] relative rounded-2xl overflow-hidden shadow-md border border-slate-200 group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500 bg-white">
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
          <img 
            src={thumbnail} 
            alt={template.name} 
            className="object-cover w-full h-full transition-opacity duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=400&q=80";
            }}
          />
        </div>

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
          {template.name || template.title}
        </h3>
      </div>
    </div>
  );
};

export default function TemplateGallery() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true);
        const data = await getCarouselTemplates();
        setTemplates(data);
      } catch (err) {
        setError("Failed to load templates");
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto space-y-8 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        <p className="text-slate-500 font-medium">Loading templates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto space-y-8 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl max-w-md">
          <h2 className="font-bold text-lg mb-1">Error</h2>
          <p>{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
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

      {templates.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-slate-500">No templates found. Please check your Firestore collection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
