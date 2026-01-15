import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SlideEditor({ slide, index, onUpdate }) {
  return (
    <div className="flex-1 max-w-xl mx-auto py-12 px-6">
      <div className="mb-10">
        <span className="text-[10px] font-bold text-[#00a0dc] tracking-[0.2em] uppercase bg-blue-50 px-2 py-1 rounded">
          Slide {index + 1}
        </span>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Slide Title</label>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-slate-600">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          <Input 
            value={slide.title}
            onChange={(e) => onUpdate('title', e.target.value)}
            className="text-2xl font-bold h-auto py-4 px-0 border-0 border-b border-transparent focus-visible:ring-0 focus-visible:border-slate-200 rounded-none bg-transparent placeholder:text-slate-200"
            placeholder="The Title of Your Visual Post Here"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Slide Description</label>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-slate-600">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          <Textarea 
            value={slide.description}
            onChange={(e) => onUpdate('description', e.target.value)}
            className="text-lg leading-relaxed min-h-[200px] h-auto p-0 border-0 border-b border-transparent focus-visible:ring-0 focus-visible:border-slate-200 rounded-none bg-transparent resize-none placeholder:text-slate-200"
            placeholder="Lorem ipsum: Lorem ipsum dolor sit amet, consetetur sadipscing."
          />
        </div>
      </div>
    </div>
  );
}
