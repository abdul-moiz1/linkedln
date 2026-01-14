import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, Info, Mic, FileAudio, Link as LinkIcon, X, Loader2, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";

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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailContent, setEmailContent] = useState("");

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

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        setIsExtracting(true);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            const res = await apiRequest("POST", "/api/user/writing-style", {
              audioData: base64Audio,
              audioType: 'audio/webm'
            });
            const data = await res.json();
            
            if (data.writingStyle) {
              setStyle(data.writingStyle); // Set the full extracted style
              toast({ title: "Voice Analyzed", description: "Successfully extracted your natural speaking voice from the recording." });
            }
            setIsExtracting(false);
          };
        } catch (err) {
          toast({ title: "Analysis Failed", variant: "destructive", description: "Could not process your voice note." });
          setIsExtracting(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast({ title: "Recording Started", description: "Speak freely to capture your voice style." });
    } catch (err) {
      toast({ title: "Microphone Access Denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleExtraction = async (type: string, data?: string) => {
    // Ensure dialog closes before processing
    const closeButton = document.querySelector('[data-state="open"] button[aria-label="Close"]') as HTMLButtonElement;
    if (closeButton && type !== "voice note" && type !== "emails") closeButton.click();

    try {
      if (type === "voice note") {
        if (isRecording) {
          stopRecording();
          if (closeButton) closeButton.click();
        } else {
          await startRecording();
        }
        return;
      } else if (type === "shared link") {
        const url = window.prompt("Enter the URL to analyze:");
        if (!url) return;
        
        setIsExtracting(true);
        try {
          const res = await apiRequest("POST", "/api/carousel/from-url", { url });
          const data = await res.json();
          
          if (data.slides) {
            const combinedText = data.slides.map((s: any) => s.finalText).join("\n\n");
            const analysisRes = await apiRequest("POST", "/api/user/writing-style", {
              text: combinedText
            });
            const analysisData = await analysisRes.json();
            if (analysisData.writingStyle) {
              setStyle(analysisData.writingStyle);
              toast({ title: "Link Analyzed", description: "Your online writing style has been extracted and updated." });
            }
          }
        } catch (err) {
          toast({ title: "Link Analysis Failed", variant: "destructive" });
        }
      } else if (type === "document" || type === "audio file") {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === "document" ? ".pdf,.doc,.docx,.txt" : "audio/*";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;

          setIsExtracting(true);
          try {
            const reader = new FileReader();
            if (type === "audio file") {
              reader.readAsDataURL(file);
              reader.onloadend = async () => {
                const base64Audio = (reader.result as string).split(',')[1];
                const res = await apiRequest("POST", "/api/user/writing-style", {
                  audioData: base64Audio,
                  audioType: file.type
                });
                const data = await res.json();
                if (data.writingStyle) {
                  setStyle(data.writingStyle);
                  toast({ title: "Audio Analyzed", description: "Voice style extracted successfully." });
                }
                setIsExtracting(false);
              };
            } else {
              // For documents, we'll send as text if it's small or handle via a specialized endpoint
              // For now, let's treat it as text extraction if possible
              reader.readAsText(file);
              reader.onloadend = async () => {
                const text = reader.result as string;
                const res = await apiRequest("POST", "/api/user/writing-style", { text });
                const data = await res.json();
                if (data.writingStyle) {
                  setStyle(data.writingStyle);
                  toast({ title: "Document Analyzed", description: "Style extracted from document." });
                }
                setIsExtracting(false);
              };
            }
          } catch (err) {
            toast({ title: "File Processing Failed", variant: "destructive" });
            setIsExtracting(false);
          }
        };
        input.click();
        return;
      } else if (type === "emails") {
        const emails = data;
        if (!emails) {
          setEmailDialogOpen(true);
          return;
        }

        setIsExtracting(true);
        try {
          const res = await apiRequest("POST", "/api/user/writing-style", { text: emails });
          const apiData = await res.json();
          if (apiData.writingStyle) {
            setStyle(apiData.writingStyle);
            toast({ title: "Emails Analyzed", description: "Professional tone extracted from your emails." });
            setEmailDialogOpen(false);
            setEmailContent("");
          }
        } catch (err) {
          toast({ title: "Email Analysis Failed", variant: "destructive" });
        }
      }
    } catch (error) {
      toast({ title: "Extraction failed", variant: "destructive" });
    } finally {
      if (type !== "voice note") setIsExtracting(false);
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
                  title={isRecording ? "Stop Recording" : "Record"}
                  description={isRecording ? "Click to analyze" : "Start speaking"}
                  icon={isRecording ? X : Mic}
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
            icon={Mail}
            onClick={() => setEmailDialogOpen(true)}
          />

          <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#00a0dc]" />
                  Analyze Your Professional Tone
                </DialogTitle>
                <DialogDescription>
                  Paste the content of 2-3 recent emails you've written. The AI will analyze your sentence structure and vocabulary to replicate your professional voice.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Textarea
                  placeholder="Paste your email content here (at least 150-200 words recommended)..."
                  className="min-h-[200px] text-sm resize-none"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEmailDialogOpen(false);
                    setEmailContent("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-[#00a0dc] hover:bg-[#008dbf]"
                  disabled={!emailContent || emailContent.length < 50 || isExtracting}
                  onClick={() => handleExtraction("emails", emailContent)}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Tone"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Your Writing Instructions</h2>
            {isExtracting && !emailDialogOpen && (
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
