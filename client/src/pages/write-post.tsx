import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Smile, 
  Sparkles, 
  AlignLeft, 
  Copy, 
  ImageIcon, 
  Video, 
  FileText,
  Calendar as CalendarIcon,
  Send,
  Monitor,
  Smartphone,
  Tablet,
  MessageCircle,
  Share2,
  ThumbsUp,
  ChevronDown,
  Plus,
  Globe
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { SessionUser } from "@shared/schema";

import { queryClient, apiRequest } from "@/lib/queryClient";

import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function WritePost() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [content, setContent] = useState("");
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [versions, setVersions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const { data: user } = useQuery<SessionUser>({ queryKey: ["/api/user"] });

  const handleSaveDraft = () => {
    if (!content) return;
    toast({
      title: "Draft Saved",
      description: "Your post draft has been saved successfully.",
    });
  };

  const handleCreatePublicLink = () => {
    const mockLink = `https://link.carouselmaker.com/${Math.random().toString(36).substring(7)}`;
    navigator.clipboard.writeText(mockLink);
    toast({
      title: "Public Link Created",
      description: "A shareable link has been copied to your clipboard.",
    });
  };

  const handleAddTag = () => {
    const tag = prompt("Enter a tag:");
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const [scheduledTime, setScheduledTime] = useState("");

  const handleSchedulePost = async () => {
    if (!content || !scheduledTime) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter content and select a date/time.",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/posts/schedule", {
        content,
        scheduledTime: new Date(scheduledTime).toISOString(),
      });
      toast({
        title: "Post Scheduled",
        description: `Your post has been scheduled for ${new Date(scheduledTime).toLocaleString()}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/scheduled"] });
      setLocation("/calendar");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Scheduling Failed",
        description: "Could not schedule the post. Please try again.",
      });
    }
  };

  const handleGenerateVersions = async () => {
    if (!content || content.length < 5) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch("/api/post/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.versions) {
        const cleanVersions = data.versions.map((v: string) => {
        // Remove "Version X: [Title]" or similar prefixes
        return v.replace(/^Version\s+\d+:?\s*.*?\n+/i, '').trim();
      });
      setVersions(cleanVersions);
      }
    } catch (err) {
      console.error("Failed to generate versions:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const initials = user?.profile?.name
    ? user.profile.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  return (
    <div className="flex h-screen w-full bg-slate-50/30 overflow-hidden">
      {/* Editor Section */}
      <div className="flex-1 flex flex-col border-r border-slate-200 bg-white">
        <header className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-900">Write Post</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Draft</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="gap-2 rounded-full font-bold text-slate-600 border border-slate-100 h-9">
              <Sparkles className="w-4 h-4 text-orange-500" />
              Check Score
            </Button>
            <div className="h-9 w-px bg-slate-200 mx-1" />
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 border border-slate-100">
              <Monitor className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </header>

        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center gap-1 mb-6 border-b border-slate-100 pb-2 sticky top-0 bg-white z-10">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => {
              const textarea = document.querySelector('textarea');
              if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                const before = text.substring(0, start);
                const after = text.substring(end);
                const selected = text.substring(start, end);
                setContent(before + `**${selected}**` + after);
              }
            }}><Bold className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => {
              const textarea = document.querySelector('textarea');
              if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                const before = text.substring(0, start);
                const after = text.substring(end);
                const selected = text.substring(start, end);
                setContent(before + `*${selected}*` + after);
              }
            }}><Italic className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setContent(prev => prev + " 😊")}><Smile className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={handleGenerateVersions}><Sparkles className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><AlignLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><Plus className="w-4 h-4" /></Button>
            
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => {
                navigator.clipboard.writeText(content);
                // toast({ title: "Copied to clipboard" });
              }}><Copy className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><ImageIcon className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><Video className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><FileText className="w-4 h-4" /></Button>
            </div>
          </div>

          <Textarea 
            placeholder="Add your content or keywords..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[300px] resize-none border-none focus-visible:ring-0 text-lg placeholder:text-slate-300 p-0"
          />

          <div className="flex justify-start mb-4">
            <Button 
              variant="outline" 
              className="rounded-full gap-2 border-[#00a0dc] text-[#00a0dc] hover:bg-blue-50 font-bold"
              onClick={handleGenerateVersions}
              disabled={isGenerating || content.length < 5}
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? "Generating Versions..." : "Generate Full Post Versions"}
            </Button>
          </div>

          {/* AI Suggestions */}
          {versions.length > 0 && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 text-[#00a0dc] font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                AI Draft Versions (Based on your style)
              </div>
              <div className="grid grid-cols-1 gap-4">
                {versions.map((version, idx) => (
                  <Card key={idx} className="border-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors cursor-pointer group" onClick={() => setContent(version)}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">Option {idx + 1}</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-[#00a0dc] p-0 group-hover:underline">Use this version</Button>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-4">{version}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-slate-100 pt-6 flex flex-col gap-6">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-tight">
              <span>Last saved at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span>{content.length} characters</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-500">Tags:</span>
              {tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="bg-blue-50 text-[#00a0dc] border-none rounded-full px-3">
                  #{tag}
                </Badge>
              ))}
              <Button 
                variant="ghost" 
                className="h-7 px-2 rounded-full border border-dashed border-slate-200 text-[#00a0dc]"
                onClick={handleAddTag}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Tag
              </Button>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" className="rounded-full px-6 font-bold h-11 border-slate-200" onClick={handleSaveDraft}>Save as Draft</Button>
                <Button variant="ghost" className="text-[#00a0dc] font-bold h-11 hover:bg-blue-50" onClick={handleCreatePublicLink}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Public Link
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative h-11">
                  <input
                    type="datetime-local"
                    className="absolute inset-0 opacity-0 cursor-pointer z-50 w-full h-full"
                    style={{ colorScheme: "light" }}
                    onChange={(e) => {
                      setScheduledTime(e.target.value);
                      console.log("Time selected:", e.target.value);
                    }}
                    value={scheduledTime}
                  />
                  <Button variant="outline" className="rounded-full px-6 gap-2 h-11 border-slate-200 font-bold relative z-10 pointer-events-none">
                    <CalendarIcon className="w-4 h-4" />
                    {scheduledTime ? new Date(scheduledTime).toLocaleDateString() : "Schedule"}
                  </Button>
                </div>
                {scheduledTime && (
                  <Button 
                    className="rounded-full px-8 h-11 bg-[#00a0dc] hover:bg-[#008dbf] text-white font-bold gap-2 animate-in fade-in slide-in-from-right-1" 
                    onClick={handleSchedulePost}
                  >
                    Confirm Schedule
                  </Button>
                )}
                <Button className="rounded-full px-8 h-11 bg-[#00a0dc] hover:bg-[#008dbf] text-white font-bold gap-2" onClick={() => toast({ title: "Publishing...", description: "Your post is being sent to LinkedIn." })}>
                  Publish
                  <ChevronDown className="w-4 h-4 opacity-50 border-l border-white/20 pl-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="w-[45%] flex flex-col bg-slate-50/50 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold text-slate-800">Post Preview</h2>
          <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-slate-100 shadow-sm">
            <Button 
              variant={device === "mobile" ? "default" : "ghost"} 
              size="icon" 
              className={`h-8 w-8 rounded-full ${device === "mobile" ? 'bg-[#00a0dc]' : 'text-slate-400'}`}
              onClick={() => setDevice("mobile")}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
            <Button 
              variant={device === "tablet" ? "default" : "ghost"} 
              size="icon" 
              className={`h-8 w-8 rounded-full ${device === "tablet" ? 'bg-[#00a0dc]' : 'text-slate-400'}`}
              onClick={() => setDevice("tablet")}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button 
              variant={device === "desktop" ? "default" : "ghost"} 
              size="icon" 
              className={`h-8 w-8 rounded-full ${device === "desktop" ? 'bg-[#00a0dc]' : 'text-slate-400'}`}
              onClick={() => setDevice("desktop")}
            >
              <Monitor className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="ghost" className="text-slate-400 font-bold text-sm">Feedback</Button>
        </div>

        <div className={`mx-auto transition-all duration-300 ${
          device === "mobile" ? "w-[360px]" : 
          device === "tablet" ? "w-[500px]" : "w-full"
        }`}>
          <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border border-slate-100">
                  <AvatarImage src={user?.profile?.picture} />
                  <AvatarFallback className="font-bold bg-blue-50 text-[#00a0dc]">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-900 truncate">{user?.profile?.name || "Now"}</span>
                    <span className="text-slate-400 font-medium">• 1st</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">LinkedIn Automation Expert</p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    <span>Now</span>
                    <span>•</span>
                    <Globe className="w-3 h-3" />
                  </div>
                </div>
              </div>

              <div className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed min-h-[100px]">
                {content || "Add your content..."}
              </div>

              <SeparatorComp className="bg-slate-100" />

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <div className="flex items-center -space-x-1">
                  <div className="bg-blue-500 p-0.5 rounded-full border border-white"><ThumbsUp className="w-2.5 h-2.5 text-white fill-white" /></div>
                  <div className="bg-red-500 p-0.5 rounded-full border border-white"><Smile className="w-2.5 h-2.5 text-white fill-white" /></div>
                  <span className="ml-2 font-medium">88</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span>4 comments</span>
                  <span>•</span>
                  <span>1 repost</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 pt-1 -mx-1">
                <Button variant="ghost" size="sm" className="flex-1 text-slate-500 font-bold gap-2 hover:bg-slate-50"><ThumbsUp className="w-4 h-4" />Like</Button>
                <Button variant="ghost" size="sm" className="flex-1 text-slate-500 font-bold gap-2 hover:bg-slate-50"><MessageCircle className="w-4 h-4" />Comment</Button>
                <Button variant="ghost" size="sm" className="flex-1 text-slate-500 font-bold gap-2 hover:bg-slate-50"><Share2 className="w-4 h-4" />Share</Button>
                <Button variant="ghost" size="sm" className="flex-1 text-slate-500 font-bold gap-2 hover:bg-slate-50"><Send className="w-4 h-4" />Send</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      </div>
  );
}

const SeparatorComp = ({ className }: { className?: string }) => <div className={`h-px w-full ${className}`} />;
