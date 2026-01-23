import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  Sparkles,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SemanticSearch } from "@/components/semantic-search";

const templates = [
  { 
    title: "WRITE HOOK THAT DON'T SUCK", 
    author: "Jon Snow", 
    handle: "@jon-snow",
    bgColor: "bg-[#1a4d3a]", 
    textColor: "text-white",
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop"
  },
  { 
    title: "insights that shape impactful decisions.", 
    author: "Gerald Smith", 
    handle: "@iamgeraldsmith",
    bgColor: "bg-[#f0f4ff]", 
    textColor: "text-slate-900",
    dots: true
  },
  { 
    title: "Quickly LEARN FROM BRAIN COACH, JIM KWIK", 
    author: "Jon Snow", 
    handle: "@jon-snow",
    bgColor: "bg-[#2d3436]", 
    textColor: "text-white",
    pill: "Swipe"
  },
  { 
    title: "HOW TO WRITE PRODUCT DESCRIPTION BETTER.", 
    author: "Jon Snow", 
    handle: "@jon-snow",
    bgColor: "bg-black", 
    textColor: "text-[#ff9f43]",
    centered: true
  },
  { 
    title: "Email is THE best way to grow your business.", 
    author: "Jon Snow", 
    handle: "@jon-snow",
    bgColor: "bg-[#f5f6fa]", 
    textColor: "text-slate-900",
    list: ["More sales", "Better relationships", "No algorithm problems"]
  },
  { 
    title: "6 WAYS TO GAIN CUSTOMER TRUST", 
    author: "Jon Snow", 
    handle: "@jon-snow",
    bgColor: "bg-[#55efc4]", 
    textColor: "text-white",
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=400&fit=crop"
  },
  { 
    title: "BUSINESS MINDSET & PERSONAL GROWTH", 
    author: "Jon Snow", 
    handle: "@jon-snow",
    bgColor: "bg-white", 
    textColor: "text-[#1a4d3a]",
    border: true
  },
  { 
    title: "HOW TO WRITE HOOK THAT DON'T SUCK", 
    author: "Jon Snow", 
    handle: "@jon-snow",
    bgColor: "bg-[#6c5ce7]", 
    textColor: "text-white",
    swipe: true
  },
  { 
    title: "How to generate leads on LinkedIn for your business", 
    author: "Jon Snow", 
    handle: "@jon-snow",
    bgColor: "bg-[#a29bfe]", 
    textColor: "text-white",
    profileCenter: true
  },
  { 
    title: "How to build your personal brand on social media", 
    author: "Aliah Lane", 
    handle: "@aliahlane",
    bgColor: "bg-[#ffeaa7]", 
    textColor: "text-[#d63031]",
    handwritten: true
  },
  { 
    title: "CONTENT PLAN STRATEGY", 
    author: "Loki Bright", 
    handle: "@lokibright",
    bgColor: "bg-[#0984e3]", 
    textColor: "text-white",
    abstract: true
  },
  { 
    title: "Content Plan Strategy", 
    author: "Orlando Diggs", 
    handle: "@ordiggs",
    bgColor: "bg-[#fff9f0]", 
    textColor: "text-slate-900",
    minimal: true
  }
];

export default function Dashboard() {
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });
  const [searchOpen, setSearchOpen] = useState(false);

  const userId = user?.firebaseUid || user?.linkedinId || user?.id || "";

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Semantic Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl p-0 border-none bg-transparent shadow-none">
          <SemanticSearch userId={userId} onClose={() => setSearchOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Top Navbar */}
      <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="bg-slate-300 w-5 h-5 rounded flex items-center justify-center text-[10px] text-slate-600">k</span>
            {user?.profile?.name?.toLowerCase().replace(' ', '')}'s Workspace
            <span className="text-[10px] font-bold text-slate-400 ml-1">(Admin)</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-9 px-4 flex items-center gap-2"
            onClick={() => setSearchOpen(true)}
            data-testid="button-open-search"
          >
            <Search className="w-4 h-4" />
            <span className="font-medium">Search</span>
          </Button>
          <Button variant="outline" size="sm" className="rounded-full border-[#6c5ce7] text-[#6c5ce7] hover:bg-[#6c5ce7]/5 h-9 px-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 fill-current" />
            <span className="font-bold">AI Assistant</span>
          </Button>
          <Avatar className="h-8 w-8 border border-slate-200">
            <AvatarImage src={user?.profile?.picture} />
            <AvatarFallback className="bg-slate-100 text-[10px] font-bold">{user?.profile?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {templates.map((template, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group"
              >
                <Card className={`aspect-[4/5] overflow-hidden rounded-xl border-none shadow-sm group-hover:shadow-xl transition-all duration-300 cursor-pointer relative ${template.bgColor} flex flex-col p-4`}>
                  {/* Template Content */}
                  <div className={`flex-1 flex flex-col ${template.centered ? 'justify-center items-center text-center' : ''}`}>
                    <h3 className={`text-base font-bold uppercase leading-tight tracking-tight ${template.textColor} line-clamp-4`}>
                      {template.title}
                    </h3>
                    
                    {template.list && (
                      <ul className="mt-4 space-y-1">
                        {template.list.map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                            <span className="w-1 h-1 rounded-full bg-slate-400" /> {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Profile Info Overlay at Bottom */}
                  <div className="flex items-center gap-2 mt-auto">
                    <Avatar className="h-6 w-6 border border-white/20">
                      <AvatarImage src={template.author === "Jon Snow" ? "https://i.pravatar.cc/150?u=jon" : "https://i.pravatar.cc/150?u=aliah"} />
                      <AvatarFallback className="text-[8px]">{template.author.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className={`text-[9px] font-bold ${template.textColor} opacity-90`}>{template.author}</span>
                      <span className={`text-[7px] ${template.textColor} opacity-60`}>{template.handle}</span>
                    </div>
                  </div>

                  {/* Icon Badges */}
                  {template.swipe && (
                    <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-sm rounded p-1">
                      <ChevronRight className={`w-3 h-3 ${template.textColor}`} />
                    </div>
                  )}
                  {template.pill && (
                    <div className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20">
                      <span className={`text-[8px] font-bold ${template.textColor}`}>{template.pill}</span>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
