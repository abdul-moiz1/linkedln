import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function SlideNavigation({ currentIndex, totalSlides, onPrev, onNext }) {
  return (
    <div className="fixed bottom-0 left-[320px] right-0 h-16 bg-white border-t flex items-center justify-center gap-6 px-8 z-40">
      <Button 
        variant="ghost" 
        onClick={onPrev} 
        disabled={currentIndex === 0}
        className="text-slate-500 font-bold hover:bg-slate-50"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        Prev
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Slide
        </span>
        <span className="text-sm font-extrabold text-[#00a0dc]">
          {currentIndex + 1}
        </span>
        <span className="text-sm font-extrabold text-slate-300">
          /
        </span>
        <span className="text-sm font-extrabold text-slate-300">
          {totalSlides}
        </span>
      </div>

      <Button 
        variant="ghost" 
        onClick={onNext} 
        disabled={currentIndex === totalSlides - 1}
        className="text-slate-500 font-bold hover:bg-slate-50"
      >
        Next
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  );
}
