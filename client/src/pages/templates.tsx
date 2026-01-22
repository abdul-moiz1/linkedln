import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCarouselTemplates } from "@/services/templatesService";
import { seedCarouselTemplates, resetAndReseedTemplates } from "@/scripts/seedTemplates";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, RefreshCcw } from "lucide-react";

const TemplateCard = ({ template }: { template: any }) => {
  const [, setLocation] = useLocation();
  const thumbnail = template.thumbnail;

  return (
    <div 
      className="group cursor-pointer flex flex-col gap-3"
      onClick={() => setLocation(`/carousel-editor/${template.id}`)}
    >
      <div className="aspect-[4/5] relative rounded-xl overflow-hidden shadow-sm border border-slate-200 group-hover:shadow-xl group-hover:-translate-y-1.5 transition-all duration-300 bg-white">
        <div className="absolute inset-0 bg-slate-50 flex items-center justify-center overflow-hidden">
          <img 
            src={thumbnail} 
            alt={template.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-20" />

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center p-4 z-40">
          <Button className="h-10 text-xs font-bold rounded-lg px-6 shadow-xl bg-slate-900 text-white hover:bg-slate-800 border-none transform translate-y-2 group-hover:translate-y-0 transition-all">
            Edit Template
          </Button>
        </div>
        
        <div className="absolute top-3 left-3 z-30 flex gap-2">
          <Badge className="bg-white/90 backdrop-blur-sm text-slate-900 border-none shadow-sm font-bold px-2 py-0.5 text-[10px] rounded-md">
            {template.slidesCount || 0} slides
          </Badge>
          {template.isNew && (
            <Badge className="bg-sky-500 text-white border-none shadow-sm font-bold px-2 py-0.5 text-[10px] rounded-md">
              NEW
            </Badge>
          )}
        </div>
      </div>
      
      <div className="px-0.5">
        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
          {template.name}
        </h3>
      </div>
    </div>
  );
};

export default function TemplateGallery() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const isDev = import.meta.env.MODE === 'development';

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await getCarouselTemplates();
      setTemplates(data || []);
      setError(null);
    } catch (err) {
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSeed = async (isReset = false) => {
    try {
      setSeeding(true);
      const result = isReset ? await resetAndReseedTemplates() : await seedCarouselTemplates();
      toast({
        title: isReset ? "Templates Reset" : "Templates Seeded",
        description: result.message
      });
      await fetchTemplates();
    } catch (err) {
      toast({
        title: "Action Failed",
        description: "An error occurred while managing templates.",
        variant: "destructive"
      });
    } finally {
      setSeeding(false);
    }
  };

  if (loading && templates.length === 0) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto space-y-8 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        <p className="text-slate-500 font-medium">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Template Gallery</h1>
          <p className="text-slate-500 text-sm font-medium">Select a professional LinkedIn template to start creating.</p>
        </div>
        
        {isDev && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleSeed(true)} 
              disabled={seeding}
              className="flex items-center gap-2 border-slate-200"
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Reset & Reseed
            </Button>
          </div>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="py-32 text-center flex flex-col items-center gap-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center">
            <Database className="h-8 w-8 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-slate-900">No templates found</h3>
            <p className="text-slate-500 max-w-xs mx-auto text-sm">Populate your Firestore collection with premium templates to get started.</p>
          </div>
          {isDev && (
            <Button onClick={() => handleSeed(false)} disabled={seeding} className="rounded-xl px-8 shadow-lg shadow-sky-100">
              {seeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Populate Gallery
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pb-20">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
