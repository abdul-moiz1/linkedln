import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CarouselTemplate, TemplateDesign } from "@shared/schema";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";

export default function TemplateGallery() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<CarouselTemplate | null>(null);
  const [editedDesign, setEditedDesign] = useState<TemplateDesign | null>(null);

  const { data: templates, isLoading } = useQuery<CarouselTemplate[]>({
    queryKey: ["/api/carousel-templates"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/user-carousels", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Carousel saved to your account." });
      setSelectedTemplate(null);
    },
  });

  if (isLoading) return <div className="p-8 text-center">Loading templates...</div>;

  if (selectedTemplate && editedDesign) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Editing: {selectedTemplate.name}</h1>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate({
              templateId: selectedTemplate.id,
              customizedDesignSchema: JSON.stringify(editedDesign),
              status: "draft"
            })}>Save My Copy</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {editedDesign.slides.map((slide, idx) => (
              <Card key={idx} className="p-4 space-y-4">
                <Label>Slide {idx + 1} Content</Label>
                <Input 
                  value={slide.titleText} 
                  onChange={(e) => {
                    const newSlides = [...editedDesign.slides];
                    newSlides[idx] = { ...slide, titleText: e.target.value };
                    setEditedDesign({ ...editedDesign, slides: newSlides });
                  }}
                  placeholder="Title"
                />
                <Input 
                  value={slide.bodyText} 
                  onChange={(e) => {
                    const newSlides = [...editedDesign.slides];
                    newSlides[idx] = { ...slide, bodyText: e.target.value };
                    setEditedDesign({ ...editedDesign, slides: newSlides });
                  }}
                  placeholder="Body text"
                />
                <div className="flex gap-2">
                   <div className="flex-1">
                     <Label>BG Color</Label>
                     <Input type="color" value={slide.backgroundColor} onChange={(e) => {
                        const newSlides = [...editedDesign.slides];
                        newSlides[idx] = { ...slide, backgroundColor: e.target.value };
                        setEditedDesign({ ...editedDesign, slides: newSlides });
                     }} />
                   </div>
                   <div className="flex-1">
                     <Label>Accent</Label>
                     <Input type="color" value={slide.accentColor} onChange={(e) => {
                        const newSlides = [...editedDesign.slides];
                        newSlides[idx] = { ...slide, accentColor: e.target.value };
                        setEditedDesign({ ...editedDesign, slides: newSlides });
                     }} />
                   </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="sticky top-8 space-y-4">
            <h2 className="text-lg font-bold">Preview</h2>
            {editedDesign.slides.map((slide, idx) => (
              <div 
                key={idx} 
                className="aspect-square w-full rounded-lg p-8 flex flex-col justify-center items-center text-center shadow-lg transition-all"
                style={{ backgroundColor: slide.backgroundColor, color: slide.accentColor }}
              >
                <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: slide.fontFamily }}>{slide.titleText}</h3>
                <p className="text-lg opacity-90" style={{ fontFamily: slide.fontFamily }}>{slide.bodyText}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Carousel Templates</h1>
        <p className="text-slate-500">Choose a professional template to get started.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template) => (
          <Card key={template.id} className="overflow-hidden hover:shadow-xl transition-shadow group">
            <div className="aspect-video relative overflow-hidden bg-slate-100">
              {template.thumbnailUrl ? (
                <img src={template.thumbnailUrl} alt={template.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold">No Preview</div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <Button variant="secondary" className="font-bold" onClick={() => {
                   setLocation("/carousel-editor");
                 }}>Use Template</Button>
              </div>
            </div>
            <CardHeader className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-slate-500">{template.category}</p>
                </div>
                <Badge variant="outline">{template.slideCount} Slides</Badge>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

const Badge = ({ children, variant = "default" }: { children: React.ReactNode, variant?: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${variant === "outline" ? "border border-slate-200 text-slate-500" : "bg-blue-100 text-blue-600"}`}>
    {children}
  </span>
);
