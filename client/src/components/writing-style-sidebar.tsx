import { useState } from "react";
import { SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Save } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function WritingStyleSidebar() {
  const { toast } = useToast();
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });
  const [style, setStyle] = useState(user?.writingStyle || "");

  const mutation = useMutation({
    mutationFn: async (newStyle: string) => {
      await apiRequest("PATCH", "/api/user", { writingStyle: newStyle });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Writing style updated" });
    },
    onError: () => {
      toast({ title: "Failed to update style", variant: "destructive" });
    },
  });

  const extractMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await apiRequest("POST", "/api/user/writing-style/extract", { 
        type,
        sample: "Sample text for extraction" 
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.writingStyle) {
        setStyle(prev => prev ? `${prev}\n\n${data.writingStyle}` : data.writingStyle);
        toast({ title: "Style extracted successfully" });
      }
    }
  });

  return (
    <div className="flex flex-col h-full bg-white">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#00a0dc]" />
          <span className="font-bold text-lg">Writing Style</span>
        </div>
      </SidebarHeader>
      <div className="p-4 space-y-4 flex-1">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Describe your voice, tone, and specific instructions for AI-generated content.
        </p>
        <Textarea
          placeholder="Professional, yet approachable. Use concise sentences..."
          className="min-h-[200px] resize-none text-sm"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        />
        <Button 
          className="w-full bg-[#00a0dc] hover:bg-[#008dbf] text-white"
          onClick={() => mutation.mutate(style)}
          disabled={mutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Style
        </Button>
      </div>
    </div>
  );
}
