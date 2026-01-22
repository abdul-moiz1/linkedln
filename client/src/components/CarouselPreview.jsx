import React from 'react';

const CarouselPreview = ({ template, data }) => {
  if (!template) return null;

  const AuthorInfo = ({ isDark = false }) => (
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

  const renderLayout = () => {
    const layout = template.layout || 'basic_cover';
    
    switch (layout) {
      case 'cover_bold':
        return (
          <div className="w-full h-full bg-slate-900 text-white p-8 flex flex-col justify-between">
            <div className="space-y-4 pt-12">
              <h2 className="text-3xl font-black leading-tight tracking-tight uppercase">{data.title || 'Masterclass'}</h2>
              <div className="h-1.5 w-16 bg-sky-500 rounded-full" />
              <p className="text-lg text-slate-300 font-medium leading-snug">{data.description || 'Transform your results with this framework'}</p>
            </div>
            <AuthorInfo isDark />
          </div>
        );
      
      case 'cover_minimal':
        return (
          <div className="w-full h-full bg-white text-slate-900 p-8 flex flex-col justify-between border-t-8 border-slate-900">
            <div className="space-y-6 pt-8">
              <h2 className="text-4xl font-extrabold tracking-tighter leading-none">{data.title || 'Minimal'}</h2>
              <p className="text-slate-500 text-sm font-medium border-l-2 border-slate-200 pl-4">{data.description || 'Less is more in design'}</p>
            </div>
            <AuthorInfo />
          </div>
        );

      case 'cover_split':
        return (
          <div className="w-full h-full flex overflow-hidden">
            <div className="w-1/2 bg-sky-500 p-6 flex flex-col justify-center text-white">
              <h2 className="text-2xl font-black uppercase leading-none">{data.title || 'The Split'}</h2>
            </div>
            <div className="w-1/2 bg-white p-6 flex flex-col justify-between">
              <p className="text-xs text-slate-600 font-bold mt-12">{data.description || 'A contrasting approach'}</p>
              <AuthorInfo />
            </div>
          </div>
        );

      case 'cover_quote':
        return (
          <div className="w-full h-full bg-slate-50 text-slate-900 p-8 flex flex-col justify-center items-center text-center relative">
            <div className="absolute top-12 text-sky-500 text-6xl font-serif opacity-20">"</div>
            <div className="space-y-4 z-10">
              <h2 className="text-2xl font-bold italic leading-relaxed">{data.title || 'Inspirational Quote'}</h2>
              <p className="text-slate-500 text-sm">— {data.description || 'Great minds think alike'}</p>
            </div>
            <div className="absolute bottom-8">
              <AuthorInfo />
            </div>
          </div>
        );

      case 'cover_stats':
        return (
          <div className="w-full h-full bg-slate-900 text-white p-8 flex flex-col justify-between">
            <div className="space-y-8">
              <div className="inline-block bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">Insights</div>
              <h2 className="text-3xl font-black leading-none tracking-tighter">{data.title || 'By The Numbers'}</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-16 bg-slate-800 rounded-lg animate-pulse" />
                <div className="h-16 bg-slate-800 rounded-lg animate-pulse" />
              </div>
              <p className="text-slate-400 text-xs">{data.description || 'How data drives growth'}</p>
            </div>
            <AuthorInfo isDark />
          </div>
        );

      case 'framework_grid':
        return (
          <div className="w-full h-full bg-white p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{data.title || 'The Framework'}</h2>
              <div className="grid grid-cols-2 gap-3 pt-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="aspect-video bg-sky-50 rounded-lg border border-sky-100 flex items-center justify-center">
                    <div className="w-1/2 h-1 bg-sky-200 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            <AuthorInfo />
          </div>
        );

      case 'howto_steps':
        return (
          <div className="w-full h-full bg-emerald-50 p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900">{data.title || 'How To Guide'}</h2>
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-emerald-100 shadow-sm">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">{i}</div>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            <AuthorInfo />
          </div>
        );

      case 'mistakes_warning':
        return (
          <div className="w-full h-full bg-red-50 p-8 flex flex-col justify-between border-l-8 border-red-500">
            <div className="space-y-4 pt-12">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-black text-xl">!</div>
              <h2 className="text-3xl font-black text-slate-900 leading-none">{data.title || 'Stop Doing This'}</h2>
              <p className="text-red-700 text-sm font-bold uppercase tracking-widest">{data.description || 'Common mistakes revealed'}</p>
            </div>
            <AuthorInfo />
          </div>
        );

      case 'stats_clean':
        return (
          <div className="w-full h-full bg-white p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{data.title || 'Growth Report'}</h2>
              <div className="flex items-end gap-2 h-24 pt-4">
                {[40, 70, 50, 90, 60].map((h, i) => (
                  <div key={i} className="flex-1 bg-indigo-500 rounded-t-md" style={{ height: `${h}%` }} />
                ))}
              </div>
              <p className="text-slate-500 text-xs italic">{data.description || 'Visualizing performance data'}</p>
            </div>
            <AuthorInfo />
          </div>
        );

      case 'cover_story':
        return (
          <div className="w-full h-full bg-rose-500 text-white p-8 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full" />
            <div className="space-y-4 pt-12 relative z-10">
              <h2 className="text-3xl font-black leading-tight italic">{data.title || 'My Journey'}</h2>
              <p className="text-white/80 text-lg font-medium border-l-4 border-white/30 pl-4">{data.description || 'The lessons I learned'}</p>
            </div>
            <AuthorInfo isDark />
          </div>
        );

      default:
        // Basic fallback layout
        return (
          <div className="w-full h-full bg-slate-900 text-white p-8 flex flex-col justify-center items-center text-center">
            <h2 className="text-3xl font-bold mb-4">{data.title || 'Your Title Here'}</h2>
            <p className="text-xl text-slate-300 mb-8">{data.description || 'Your description here'}</p>
            <AuthorInfo isDark />
          </div>
        );
    }
  };

  return (
    <div className="aspect-[4/5] w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-slate-200 mx-auto sticky top-8">
      {renderLayout()}
    </div>
  );
};

export default CarouselPreview;
