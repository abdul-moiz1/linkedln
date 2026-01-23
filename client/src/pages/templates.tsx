import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getCarouselTemplates } from "@/services/templatesService";
import { seedCarouselTemplates, resetAndReseedTemplates } from "@/scripts/seedTemplates";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, RefreshCcw, Search, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const TemplateCard = ({ template }: { template: any }) => {
  const [, setLocation] = useLocation();
  const thumbnail = template.thumbnail;

  return (
    <div 
      className="group cursor-pointer flex flex-col gap-3"
      onClick={() => {
        console.log("Template card clicked. Object:", template);
        console.log("Navigating to:", `/carousel-editor/${template.id}`);
        setLocation(`/carousel-editor/${template.id}`);
      }}
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
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const isDev = import.meta.env.MODE === 'development';

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await getCarouselTemplates();
      setTemplates(data || []);
      setFilteredTemplates(data || []);
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

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/vector/search", {
        collection: "carouselTemplates",
        userId: "global",
        query,
        topK: 20
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.results) {
        setFilteredTemplates(data.results);
      } else {
        setFilteredTemplates([]);
      }
      setIsSearching(false);
    },
    onError: (err) => {
      console.error("Template search failed:", err);
      toast({
        title: "Search Failed",
        description: "Falling back to basic filtering.",
        variant: "destructive"
      });
      // Fallback to local search if API fails
      const filtered = templates.filter(t => 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTemplates(filtered);
      setIsSearching(false);
    }
  });

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates);
      return;
    }
    setIsSearching(true);
    searchMutation.mutate(searchQuery.trim());
  };

  const clearSearch = () => {
    setSearchQuery("");
    setFilteredTemplates(templates);
  };

  const handleSeed = async (isReset = false) => {
    try {
      setSeeding(true);
      console.log(`[Templates] Starting seed. Reset: ${isReset}`);
      const result = isReset ? await resetAndReseedTemplates() : await seedCarouselTemplates();
      console.log(`[Templates] Seed result:`, result);
      toast({
        title: isReset ? "Templates Reset" : "Templates Seeded",
        description: result.message
      });
      await fetchTemplates();
    } catch (err) {
      console.error(`[Templates] Seed failed:`, err);
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
    <div className="p-8 w-full mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Template Gallery</h1>
          <p className="text-slate-500 text-sm font-medium">Select a professional LinkedIn template to start creating.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 w-[200px] sm:w-[300px] rounded-xl border-slate-200 focus:ring-sky-500"
              data-testid="input-template-search"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={clearSearch}
                className="absolute right-3 hover:text-slate-600 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
          
          {isDev && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleSeed(true)} 
              disabled={seeding}
              className="flex items-center gap-2 border-slate-200 rounded-xl"
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Reset
            </Button>
          )}
        </div>
      </div>

      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
          <p className="text-slate-500 font-medium">Finding the perfect templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-32 mx-4 text-center flex flex-col items-center gap-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-slate-900">No matches found</h3>
            <p className="text-slate-500 max-w-xs mx-auto text-sm">
              Try searching for something else like "minimalist" or "corporate".
            </p>
          </div>
          <Button variant="outline" onClick={clearSearch} className="rounded-xl px-8 border-slate-200">
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 px-4 pb-20">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
