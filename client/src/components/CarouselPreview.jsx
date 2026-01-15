import { User } from "lucide-react";

export default function CarouselPreview({ carousel, currentSlideIndex }) {
  const slide = carousel.slides[currentSlideIndex];
  const { theme, profile } = carousel;

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 p-12">
      <div className="w-full max-w-[500px] aspect-square relative rounded-[32px] shadow-2xl overflow-hidden flex flex-col" style={{ backgroundColor: theme.backgroundColor }}>
        {/* Background elements (dots/patterns) */}
        <div className="absolute top-8 right-8 flex gap-1.5 opacity-20">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
          ))}
        </div>
        
        {/* Header (Handle) */}
        <div className="px-10 pt-10 pb-6 flex items-start">
          <span className="text-sm font-semibold opacity-60" style={{ color: theme.secondaryColor, fontFamily: theme.secondaryFont }}>
            {profile.handle || "@handle"}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 px-10 flex flex-col justify-center space-y-6">
          <h2 className="text-[32px] font-extrabold leading-[1.2] tracking-tight" style={{ color: theme.primaryColor, fontFamily: theme.primaryFont }}>
            {slide.title || "Your Title Here"}
          </h2>
          <p className="text-xl leading-relaxed opacity-90" style={{ color: theme.secondaryColor, fontFamily: theme.secondaryFont }}>
            {slide.description || "Your slide content goes here..."}
          </p>
        </div>

        {/* Footer */}
        <div className="px-10 py-10 flex items-center justify-between border-t border-white/5 bg-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
              {profile.avatar ? (
                <img src={profile.avatar} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <User className="w-6 h-6 text-white/40" />
              )}
            </div>
            <span className="font-bold text-sm" style={{ color: theme.secondaryColor, fontFamily: theme.secondaryFont }}>
              {profile.name || "Your Name"}
            </span>
          </div>
          
          <div className="flex gap-1 opacity-20">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
            ))}
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs font-bold text-slate-400 uppercase tracking-widest">Slide Preview</p>
    </div>
  );
}
