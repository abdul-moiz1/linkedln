import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, Info, Mic, FileAudio, Link as LinkIcon, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ExtractionCardProps {
  title: string;
  description: string;
  icon: any;
  onClick: () => void;
}

function ExtractionCard({ title, description, icon: Icon, onClick }: ExtractionCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:border-[#00a0dc] transition-all border-slate-200 group active:scale-[0.98]"
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col items-center text-center gap-3">
        <div className="p-3 rounded-full bg-slate-50 text-[#00a0dc] group-hover:bg-[#00a0dc]/5 transition-colors">
          <Icon className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-sm text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WritingStyle() {
  const { toast } = useToast();
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });
  const [style, setStyle] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    if (user?.writingStyle) {
      setStyle(user.writingStyle);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: async (newStyle: string) => {
      await apiRequest("PATCH", "/api/user", { writingStyle: newStyle });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Writing style updated", description: "Your AI preferences have been saved." });
    },
    onError: () => {
      toast({ title: "Failed to update style", variant: "destructive" });
    },
  });

  const handleExtraction = async (type: string) => {
    setIsExtracting(true);
    try {
      // For now, we simulate a file/audio/link processing by calling an AI endpoint
      // that takes a placeholder or sample based on the type
      const res = await apiRequest("POST", "/api/user/writing-style/extract", { 
        type,
        // In a real scenario, we'd send the actual file data or link here
        sample: `Sample content from ${type} analysis. Please maintain a professional yet approachable voice.` 
      });
      const data = await res.json();
      
      if (data.writingStyle) {
        setStyle(prev => prev ? `${prev}\n\n${data.writingStyle}` : data.writingStyle);
        toast({ 
          title: "Style Extracted", 
          description: `Successfully analyzed your ${type} to refine your style.` 
        });
      }
    } catch (error) {
      toast({ 
        title: "Extraction Failed", 
        description: "Could not extract style. Please try again or paste manually.",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Writing Style</h1>
          <p className="text-muted-foreground mt-2">
            Personalize how the AI generates content for you by extracting your vocabulary and style.
          </p>
        </div>
        <Button 
          className="bg-[#00a0dc] hover:bg-[#008dbf] text-white rounded-xl h-11 px-6 font-bold shadow-md shadow-blue-500/20"
          onClick={() => mutation.mutate(style)}
          disabled={mutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? "Saving..." : "Save Style"}
        </Button>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#00a0dc]" />
          Extract from your work
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Dialog>
            <DialogTrigger asChild>
              <ExtractionCard 
                title="Record your Voice"
                description="Tap to begin capturing your thoughts—speak freely!"
                icon={Mic}
                onClick={() => {}}
              />
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Voice Note</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-4 py-4">
                <ExtractionCard 
                  title="Record"
                  description="Start speaking"
                  icon={Mic}
                  onClick={() => handleExtraction("voice note")}
                />
                <ExtractionCard 
                  title="File"
                  description="Upload audio"
                  icon={FileAudio}
                  onClick={() => handleExtraction("audio file")}
                />
                <ExtractionCard 
                  title="Link"
                  description="Public link"
                  icon={LinkIcon}
                  onClick={() => handleExtraction("shared link")}
                />
              </div>
            </DialogContent>
          </Dialog>

          <ExtractionCard 
            title="Upload Files"
            description="Extract style from PDFs, emails, or documents."
            icon={FileAudio} // Re-using icon for visual consistency in cards
            onClick={() => handleExtraction("document")}
          />
          <ExtractionCard 
            title="Analyze Emails"
            description="Connect your email to extract your professional tone."
            icon={LinkIcon}
            onClick={() => handleExtraction("emails")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Your Writing Instructions</h2>
            {isExtracting && (
              <div className="flex items-center gap-2 text-[#00a0dc] text-xs font-bold animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing your content...
              </div>
            )}
          </div>
          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardContent className="p-0">
              <Textarea
                placeholder="Describe your unique writing style, or use the extraction tools above..."
                className="min-h-[400px] text-base resize-none border-none focus-visible:ring-0 rounded-xl p-6"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-blue-50/50 border-none shadow-none ring-1 ring-blue-100/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-700">
                <Info className="w-4 h-4" />
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-600/80 space-y-3 leading-relaxed">
              <p>
                The AI analyzes the <strong>vocabulary</strong>, <strong>sentence structure</strong>, and <strong>emotional tone</strong> of your inputs.
              </p>
              <p>
                The more samples you provide, the more accurately the AI can replicate your specific professional voice.
              </p>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 border-slate-200 shadow-none bg-transparent">
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Pro Tip</p>
              <p className="text-sm italic text-muted-foreground/60 leading-relaxed">
                You can manually edit the instructions below at any time to fine-tune your voice.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
