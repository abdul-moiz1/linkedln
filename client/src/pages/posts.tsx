import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ArrowLeft, Image as ImageIcon, Link, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { SessionUser } from "@shared/schema";

export default function PostsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [postContent, setPostContent] = useState("");
  
  const { data: user, isLoading: userLoading } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
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
        </div>

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
