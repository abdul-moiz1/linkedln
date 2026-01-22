import React from 'react';

const CarouselPreview = ({ template, data }) => {
  if (!template) return null;

  const renderLayout = () => {
    switch (template.layout) {
      case 'basic_cover':
        return (
          <div className="w-full h-full bg-slate-900 text-white p-8 flex flex-col justify-center items-center text-center">
            <h2 className="text-3xl font-bold mb-4">{data.title || 'Your Title Here'}</h2>
            <p className="text-xl text-slate-300">{data.description || 'Your description here'}</p>
            <div className="mt-8 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${data.authorName}`} alt="avatar" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-none">{data.authorName || 'Jon Snow'}</p>
                <p className="text-[10px] text-slate-400 leading-none">{data.authorHandle || '@jon-snow'}</p>
              </div>
            </div>
          </div>
        );
      case 'basic_modern':
        return (
          <div className="w-full h-full bg-white text-slate-900 p-8 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold text-xl">
                {data.authorName?.[0] || 'J'}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold leading-none">{data.authorName || 'Jon Snow'}</p>
                <p className="text-[10px] text-slate-400 leading-none">{data.authorHandle || '@jon-snow'}</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center py-8">
              <h2 className="text-2xl font-black uppercase mb-4 tracking-tighter">{data.title || 'Your Title Here'}</h2>
              <p className="text-slate-600 line-clamp-4">{data.description || 'Your description here'}</p>
            </div>
            <div className="h-1 bg-sky-500 w-1/4 rounded-full" />
          </div>
        );
      default:
        return <div className="p-8">Unsupported layout: {template.layout}</div>;
    }
  };

  return (
    <div className="aspect-[4/5] w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-slate-200 mx-auto sticky top-8">
      {renderLayout()}
    </div>
  );
};

export default CarouselPreview;
