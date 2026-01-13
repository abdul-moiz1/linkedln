import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ArrowLeft, Image as ImageIcon, Link, Send, Sparkles, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SessionUser } from "@shared/schema";

export default function PostsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [postContent, setPostContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showStyleDialog, setShowStyleDialog] = useState(false);
  const [styleText, setStyleText] = useState("");
  
  const { data: user, isLoading: userLoading } = useQuery<SessionUser & { writingStyle?: string }>({
    queryKey: ["/api/user"],
  });

  const [prompt, setPrompt] = useState("");

  const analyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/user/writing-style", { text });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Writing style analyzed and saved!" });
      setShowStyleDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (promptText: string) => {
      // We'll use the existing /api/images/generate but tweak it to return text if prompt starts with "Write"
      // Or better, let's assume the backend can handle a new /api/posts/generate endpoint
      const res = await apiRequest("POST", "/api/posts/generate", { 
        prompt: promptText,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.text) setPostContent(data.text);
      toast({ title: "Post Generated", description: "AI has drafted a post in your style." });
    }
  });

  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/share", { text: content });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post shared on LinkedIn successfully!",
      });
      setPostContent("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to share post",
      });
    },
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-2xl mx-auto p-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button 
            onClick={() => navigate("/")} 
            variant="ghost" 
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Write Post</h1>
          {user?.writingStyle ? (
            <Badge variant="secondary" className="ml-auto flex items-center gap-1 py-1 px-3">
              <Sparkles className="w-3 h-3 text-yellow-500" />
              Style Profile Active
              <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={() => setShowStyleDialog(true)}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </Badge>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-auto flex items-center gap-2 border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
              onClick={() => setShowStyleDialog(true)}
            >
              <Sparkles className="w-4 h-4" />
              Setup Writing Style
            </Button>
          )}
        </div>

        {showStyleDialog && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50/30">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Analyze Your Writing Style
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowStyleDialog(false)}>
                <X className="h-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-xs text-muted-foreground mb-3">
                Paste an example of your writing (post, email, or article) below. Our AI will analyze your vocabulary and tone to match it in future posts.
              </p>
              <Textarea 
                placeholder="Paste your sample text here..."
                className="min-h-[100px] mb-3 text-sm"
                value={styleText}
                onChange={(e) => setStyleText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowStyleDialog(false)}>Cancel</Button>
                <Button 
                  size="sm" 
                  onClick={() => analyzeMutation.mutate(styleText)}
                  disabled={!styleText.trim() || analyzeMutation.isPending}
                >
                  {analyzeMutation.isPending && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                  Analyze & Save
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-white pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profile?.picture} />
                <AvatarFallback>{user?.profile?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-sm font-bold">{user?.profile?.name}</CardTitle>
                <p className="text-xs text-muted-foreground">Post to LinkedIn</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 bg-white">
            <div className="p-4 border-b bg-gray-50/30">
              <div className="flex gap-2">
                <Input 
                  placeholder="What should the AI write about? (e.g. My new product launch)" 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="flex-1 bg-white"
                />
                <Button 
                  variant="outline" 
                  onClick={() => generateMutation.mutate(prompt)}
                  disabled={!prompt.trim() || generateMutation.isPending}
                  className="gap-2"
                >
                  {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-500" />}
                  AI Generate
                </Button>
              </div>
            </div>
            <Textarea
              placeholder="What do you want to talk about?"
              className="min-h-[200px] border-none focus-visible:ring-0 text-lg p-4 resize-none"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
            />
            
            <div className="p-3 border-t flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-blue-600">
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-blue-600">
                  <Link className="w-5 h-5" />
                </Button>
              </div>
              
              <Button 
                onClick={() => postMutation.mutate(postContent)}
                disabled={!postContent.trim() || postMutation.isPending}
                className="bg-[#00a0dc] hover:bg-[#008dbf] text-white font-bold px-6 rounded-full"
              >
                {postMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Post
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
