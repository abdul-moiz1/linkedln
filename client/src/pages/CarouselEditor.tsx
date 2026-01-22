import { useState, useEffect } from "react";
import CarouselHeader from "@/components/CarouselHeader";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams, Link } from "wouter";
import { carouselTemplates } from "@/templates/carouselTemplates";
import CarouselPreview from "@/components/CarouselPreview";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

export default function CarouselEditor() {
  const { toast } = useToast();
  const { templateId } = useParams();
  const [, setLocation] = useLocation();

  const template = carouselTemplates.find(t => t.id === templateId);

  const [formData, setFormData] = useState({
    authorName: "Jon Snow",
    authorHandle: "@jon-snow",
    title: "",
    description: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem(`draft_${templateId}`);
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, [templateId]);

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

  const handleSave = () => {
    localStorage.setItem(`draft_${templateId}`, JSON.stringify(formData));
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
                <div className="pt-2">
                  <div className="aspect-square rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                    Profile Picture
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Middle Panel: Content Editor */}
          <div className="lg:col-span-5 space-y-6 overflow-y-auto">
            <Card className="p-6 space-y-6">
              <h2 className="text-lg font-bold">Content Editor</h2>
              <div className="space-y-6">
                {template.fields.includes("title") && (
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter catch hook..."
                    />
                  </div>
                )}
                {template.fields.includes("description") && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Write your main content here..."
                      className="min-h-[150px]"
                    />
                  </div>
                )}
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
