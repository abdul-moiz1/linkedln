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
  const [formData, setFormData] = useState<any>({
    authorName: "Jon Snow",
    authorHandle: "@jon-snow",
    title: "",
    description: "",
  });

  useEffect(() => {
    async function loadTemplate() {
      if (!templateId) return;
      try {
        setLoading(true);
        const data = await getTemplateById(templateId);
        if (data) {
          setTemplate(data);
          
          // Preload from localStorage if exists
          const saved = localStorage.getItem(`draft_${templateId}`);
          if (saved) {
            try {
              const draft = JSON.parse(saved);
              setFormData(draft.data || draft);
            } catch (e) {
              console.error("Failed to load draft", e);
            }
          } else if (data.defaults) {
            // Use template defaults if no draft
            setFormData(prev => ({
              ...prev,
              ...data.defaults
            }));
          }
        }
      } catch (err) {
        console.error("Error loading template:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [templateId]);

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

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col overflow-hidden text-[#1a1a1a]">
      <CarouselHeader 
        title={template.name}
        lastSaved={new Date().toLocaleTimeString()}
        onSave={handleSave}
        onContinue={handleContinue}
      />
      
      <main className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-[1600px] mx-auto">
          {/* Left Panel: Brand/Profile */}
          <div className="lg:col-span-3 space-y-6 overflow-y-auto">
            <Card className="p-4 space-y-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Brand / Profile</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Name</Label>
                  <Input 
                    value={formData.authorName} 
                    onChange={e => setFormData({...formData, authorName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Handle</Label>
                  <Input 
                    value={formData.authorHandle} 
                    onChange={e => setFormData({...formData, authorHandle: e.target.value})}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Middle Panel: Content Editor */}
          <div className="lg:col-span-5 space-y-6 overflow-y-auto">
            <Card className="p-6 space-y-6">
              <h2 className="text-lg font-bold">Content Editor</h2>
              <div className="space-y-6">
                {(template.fields || []).map(field => {
                  if (field === "title") {
                    return (
                      <div key={field} className="space-y-2">
                        <Label>Title</Label>
                        <Input 
                          value={formData.title} 
                          onChange={e => setFormData({...formData, title: e.target.value})}
                          placeholder="Enter catch hook..."
                        />
                      </div>
                    );
                  }
                  if (field === "description") {
                    return (
                      <div key={field} className="space-y-2">
                        <Label>Description</Label>
                        <Textarea 
                          value={formData.description} 
                          onChange={e => setFormData({...formData, description: e.target.value})}
                          placeholder="Write your main content here..."
                          className="min-h-[150px]"
                        />
                      </div>
                    );
                  }
                  // Fallback for other potential fields like authorName/authorHandle if they appear in fields array
                  if (field !== "authorName" && field !== "authorHandle") {
                    return (
                      <div key={field} className="space-y-2">
                        <Label className="capitalize">{field}</Label>
                        <Input 
                          value={formData[field] || ""} 
                          onChange={e => setFormData({...formData, [field]: e.target.value})}
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </Card>
          </div>

          {/* Right Panel: Live Preview */}
          <div className="lg:col-span-4 overflow-y-auto flex flex-col items-center">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Live Preview</h2>
            <CarouselPreview template={template} data={formData} />
          </div>
        </div>
      </main>
    </div>
  );
}
