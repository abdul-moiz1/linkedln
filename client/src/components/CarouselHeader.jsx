import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

interface CarouselHeaderProps {
  title: string;
  lastSaved: string;
  onSave: () => void;
  onContinue: () => void;
}

export default function CarouselHeader({ title, lastSaved, onSave, onContinue }: CarouselHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation("/templates")}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>
          <p className="text-xs text-slate-500 font-medium">Last saved on {lastSaved}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onSave} className="font-semibold px-6">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button onClick={onContinue} className="bg-[#00a0dc] hover:bg-[#008dbf] text-white font-semibold px-6">
          Continue
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </header>
  );
}
