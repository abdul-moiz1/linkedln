import React from 'react';

const CarouselPreview = ({ template, data, currentSlideIndex = 0 }) => {
  if (!template) {
    return (
      <div className="aspect-[4/5] w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-slate-200 mx-auto flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Loading preview...</p>
      </div>
    );
  }

  // Determine theme with intelligent fallbacks based on layout if theme object is missing
  const getInitialTheme = () => {
    if (template.theme) return template.theme;
    
    // Fallback themes based on layout string
    const layout = template.layout || '';
    if (layout.includes('mistakes') || layout.includes('warning')) {
      return { primaryColor: "#ef4444", backgroundColor: "#fef2f2", textColor: "#991b1b", secondaryTextColor: "#b91c1c", cardBg: "#ffffff", accentColor: "#ef4444", isDark: false };
    }
    if (layout.includes('howto') || layout.includes('steps')) {
      return { primaryColor: "#10b981", backgroundColor: "#f0fdf4", textColor: "#0f172a", secondaryTextColor: "#166534", cardBg: "#ffffff", accentColor: "#10b981", isDark: false };
    }
    if (layout.includes('stats_clean') || layout.includes('growth')) {
      return { primaryColor: "#6366f1", backgroundColor: "#ffffff", textColor: "#0f172a", secondaryTextColor: "#4f46e5", cardBg: "#f8fafc", accentColor: "#6366f1", isDark: false };
    }
    if (layout.includes('minimal') || layout.includes('simple')) {
      return { primaryColor: "#0f172a", backgroundColor: "#ffffff", textColor: "#0f172a", secondaryTextColor: "#64748b", cardBg: "#f8fafc", accentColor: "#0ea5e9", isDark: false };
    }
    if (layout.includes('split') || layout.includes('framework')) {
      return { primaryColor: "#0ea5e9", backgroundColor: "#ffffff", textColor: "#0f172a", secondaryTextColor: "#64748b", cardBg: "#f8fafc", accentColor: "#0ea5e9", isDark: false };
    }
    
    // Default Dark Theme (The Masterclass / Bold)
    return {
      primaryColor: '#38bdf8',
      backgroundColor: '#0f172a',
      accentColor: '#10b981',
      textColor: '#ffffff',
      secondaryTextColor: 'rgba(255,255,255,0.7)',
      cardBg: 'rgba(255,255,255,0.05)',
      isDark: true
    };
  };

  const theme = getInitialTheme();

  // Log theme for debugging to see why preview isn't changing
  console.log(`[CarouselPreview] Rendering template: "${template.name}" with theme:`, theme);

  const slideLayouts = template.slideLayouts || [];
  const currentLayout = slideLayouts[currentSlideIndex] || (
    currentSlideIndex === 0 ? 'cover' : 
    currentSlideIndex === (template.slidesCount - 1) ? 'cta' : 'bullets'
  );

  const AuthorInfo = ({ forceIsDark = null }) => {
    const isDark = forceIsDark !== null ? forceIsDark : theme.isDark;
    return (
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'} overflow-hidden border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${data.authorName || 'default'}`} alt="avatar" />
        </div>
        <div className="text-left">
          <p className={`text-[10px] font-bold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>{data.authorName || 'Your Name'}</p>
          <p className={`text-[8px] leading-none mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{data.authorHandle || '@handle'}</p>
        </div>
      </div>
    );
  };

  const slideContent = data.slides?.[currentSlideIndex] || { title: '', description: '' };
  const displayTitle = slideContent.title || 'Slide Title';
  const displayDescription = slideContent.description || 'Slide Description';

  const renderSlideContent = () => {
    switch (currentLayout) {
      case 'cover':
        return (
          <div className="flex flex-col justify-between h-full" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
            <div className="space-y-4 pt-12 p-8">
              <h2 className="text-3xl font-black leading-tight tracking-tight uppercase" style={{ color: theme.textColor }}>{displayTitle}</h2>
              <div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
              <p className="text-lg font-medium leading-snug" style={{ color: theme.secondaryTextColor }}>{displayDescription}</p>
            </div>
            <div className="p-8"><AuthorInfo /></div>
          </div>
        );

      case 'bullets':
        const bullets = displayDescription.split('\n').filter(b => b.trim());
        return (
          <div className="flex flex-col justify-between h-full" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-bold" style={{ color: theme.textColor }}>{displayTitle}</h2>
              <ul className="space-y-4">
                {bullets.length > 0 ? bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full flex-none" style={{ backgroundColor: theme.primaryColor }} />
                    <span className="text-sm font-medium leading-relaxed" style={{ color: theme.secondaryTextColor }}>{bullet}</span>
                  </li>
                )) : (
                  <li className="text-sm italic opacity-50">Write slide content as new lines for bullets...</li>
                )}
              </ul>
            </div>
            <div className="p-8"><AuthorInfo /></div>
          </div>
        );

      case 'steps':
        const steps = displayDescription.split('\n').filter(s => s.trim()).slice(0, 3);
        return (
          <div className="flex flex-col justify-between h-full" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-bold" style={{ color: theme.textColor }}>{displayTitle}</h2>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="p-4 rounded-lg border flex items-center gap-4" style={{ backgroundColor: theme.cardBg, borderColor: theme.primaryColor + '40' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: theme.primaryColor }}>{i + 1}</div>
                    <p className="text-sm font-semibold" style={{ color: theme.textColor }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8"><AuthorInfo /></div>
          </div>
        );

      case 'quote':
        return (
          <div className="flex flex-col justify-between h-full relative overflow-hidden" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
            <div className="absolute top-8 left-8 text-8xl font-serif opacity-10" style={{ color: theme.primaryColor }}>"</div>
            <div className="flex-1 flex flex-col justify-center p-10 text-center relative z-10">
              <h2 className="text-2xl font-bold italic leading-relaxed mb-4" style={{ color: theme.textColor }}>{displayTitle}</h2>
              <p className="text-sm font-medium uppercase tracking-widest" style={{ color: theme.primaryColor }}>{displayDescription}</p>
            </div>
            <div className="p-8 flex justify-center"><AuthorInfo /></div>
          </div>
        );

      case 'proof':
        const stats = displayDescription.split('\n').filter(s => s.trim()).slice(0, 2);
        return (
          <div className="flex flex-col justify-between h-full" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
            <div className="p-8 space-y-8 pt-12">
              <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: theme.textColor }}>{displayTitle}</h2>
              <div className="grid grid-cols-1 gap-4">
                {stats.map((stat, i) => (
                  <div key={i} className="p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center" style={{ borderColor: theme.accentColor + '40', backgroundColor: theme.accentColor + '08' }}>
                    <span className="text-3xl font-black mb-1" style={{ color: theme.accentColor }}>{stat.split(':')[0]}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.secondaryTextColor }}>{stat.split(':')[1] || 'Metric'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8"><AuthorInfo /></div>
          </div>
        );

      case 'cta':
        return (
          <div className="flex flex-col justify-center items-center h-full text-center p-8 relative overflow-hidden" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: theme.primaryColor }} />
            <div className="space-y-6 relative z-10">
              <h2 className="text-3xl font-black leading-tight" style={{ color: theme.textColor }}>{displayTitle}</h2>
              <p className="text-lg font-medium" style={{ color: theme.secondaryTextColor }}>{displayDescription}</p>
              <div className="pt-8">
                <AuthorInfo />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col justify-between h-full" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
            <div className="p-8 space-y-4">
              <h2 className="text-2xl font-bold">{displayTitle}</h2>
              <p className="text-sm" style={{ color: theme.secondaryTextColor }}>{displayDescription}</p>
            </div>
            <div className="p-8"><AuthorInfo /></div>
          </div>
        );
    }
  };

  return (
    <div className="aspect-[4/5] w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-slate-200 mx-auto sticky top-8">
      {renderSlideContent()}
    </div>
  );
};

export default CarouselPreview;
