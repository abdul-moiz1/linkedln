import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, Info } from "lucide-react";

export default function WritingStyle() {
  const { toast } = useToast();
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });
  const [style, setStyle] = useState("");

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

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Writing Style</h1>
        <p className="text-muted-foreground mt-2">
          Personalize how the AI generates content for you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00a0dc]" />
                Your Voice & Tone
              </CardTitle>
              <CardDescription>
                Describe your unique writing style, tone, and any specific formatting preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g. Professional yet conversational. Use bullet points for readability. Avoid corporate jargon. Focus on practical insights..."
                className="min-h-[300px] text-base resize-none focus-visible:ring-[#00a0dc] rounded-xl p-4"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
              <Button 
                className="w-full bg-[#00a0dc] hover:bg-[#008dbf] text-white rounded-xl h-12 font-bold shadow-md shadow-blue-500/20"
                onClick={() => mutation.mutate(style)}
                disabled={mutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {mutation.isPending ? "Saving..." : "Save Writing Style"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-blue-50/50 border-none shadow-none ring-1 ring-blue-100/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-700">
                <Info className="w-4 h-4" />
                Tips for best results
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-600/80 space-y-3">
              <p>
                <strong>Be Specific:</strong> Mention if you prefer short sentences, storytelling, or data-driven content.
              </p>
              <p>
                <strong>Audience:</strong> Describe who you are writing for (e.g. tech founders, marketing managers).
              </p>
              <p>
                <strong>Formatting:</strong> Specify if you like emojis, bold text, or specific spacing styles.
              </p>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 border-slate-200 shadow-none bg-transparent">
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Preview</p>
              <p className="text-sm italic text-muted-foreground/60">
                The AI will use these instructions every time you generate a new post or carousel.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
