import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { 
  PenLine, 
  Mic, 
  FileText, 
  Layers, 
  Upload, 
  X,
  Sparkles
} from "lucide-react";
import { useLocation } from "wouter";

interface CreatePostModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePostModal({ isOpen, onOpenChange }: CreatePostModalProps) {
  const [, setLocation] = useLocation();

  const options = [
    {
      title: "Write Manually",
      description: "Compose your post by hand for a personal touch.",
      icon: PenLine,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      url: "/write-post"
    },
    {
      title: "Start PostCast Sessions",
      description: "Chat with AI Alex, generate LinkedIn posts with ease.",
      icon: Mic,
      color: "text-[#00a0dc]",
      bgColor: "bg-blue-50",
      badge: "New",
      url: "/postcast"
    },
    {
      title: "Repurpose from YouTube, Blog, PDF",
      description: "Transform existing content into new formats.",
      icon: Sparkles,
      color: "text-blue-400",
      bgColor: "bg-blue-50",
      url: "/dashboard" // Placeholder for repurpose feature
    },
    {
      title: "Create Carousel",
      description: "Build a captivating multi-slide post to engage audience.",
      icon: Layers,
      color: "text-blue-300",
      bgColor: "bg-blue-50",
      url: "/create"
    }
  ];

  const handleOptionClick = (url: string) => {
    setLocation(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white">
        <DialogHeader className="p-8 pb-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <PenLine className="w-5 h-5 text-slate-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">Create Your LinkedIn Post</DialogTitle>
          </div>
          <DialogClose className="rounded-full h-8 w-8 flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </DialogClose>
        </DialogHeader>

        <div className="p-8 pt-0 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((option) => (
              <Card 
                key={option.title}
                className="hover-elevate cursor-pointer border-slate-100 group transition-all rounded-2xl"
                onClick={() => handleOptionClick(option.url)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${option.bgColor} flex items-center justify-center ${option.color} group-hover:scale-110 transition-transform`}>
                      <option.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 leading-tight">{option.title}</h3>
                        {option.badge && (
                          <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                            {option.badge}
                            <Sparkles className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-sm font-bold uppercase tracking-widest">
              <span className="bg-white px-4 text-orange-500 italic">OR</span>
            </div>
          </div>

          <div className="pb-4">
            <Card 
              className="border-2 border-dashed border-slate-200 hover:border-[#00a0dc] hover:bg-blue-50/30 cursor-pointer group transition-all rounded-2xl"
              onClick={() => handleOptionClick("/dashboard")}
            >
              <CardContent className="p-8 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#00a0dc] group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Upload Drafts in Bulk</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Upload multiple draft files at once for efficient posting.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
