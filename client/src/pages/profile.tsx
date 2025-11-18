import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SiLinkedin } from "react-icons/si";
import { Copy, LogOut, Send, Check, Loader2, List, Calendar } from "lucide-react";
import type { SessionUser, CreatePost } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Profile() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [postText, setPostText] = useState("");
  const [copied, setCopied] = useState(false);

  // Fetch current user session
  const { data: user, isLoading } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: CreatePost) => {
      return await apiRequest("POST", "/api/share", data);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your post has been shared on LinkedIn",
      });
      setPostText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to share post",
        variant: "destructive",
      });
    },
  });

  const handleCopyToken = async () => {
    if (user?.accessToken) {
      await navigator.clipboard.writeText(user.accessToken);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Access token copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreatePost = () => {
    if (!postText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for your post",
        variant: "destructive",
      });
      return;
    }
    createPostMutation.mutate({ text: postText });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/";
    return null;
  }

  const { profile, accessToken } = user;
  const initials = profile.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : profile.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <SiLinkedin className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">LinkedIn OAuth Demo</h1>
          </div>
          <Button
            onClick={() => logoutMutation.mutate()}
            variant="ghost"
            size="sm"
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl py-8 space-y-8">
        {/* Profile Section */}
        <Card data-testid="card-profile">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Data retrieved from LinkedIn's /v2/userinfo endpoint
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile.picture} alt={profile.name || "User"} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <h2 className="text-2xl font-bold" data-testid="text-profile-name">
                  {profile.name || "LinkedIn User"}
                </h2>
                {profile.email && (
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground" data-testid="text-profile-email">
                      {profile.email}
                    </p>
                    {profile.email_verified && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Profile Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.given_name && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    First Name
                  </Label>
                  <p className="font-medium" data-testid="text-given-name">{profile.given_name}</p>
                </div>
              )}
              {profile.family_name && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Last Name
                  </Label>
                  <p className="font-medium" data-testid="text-family-name">{profile.family_name}</p>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  LinkedIn ID
                </Label>
                <p className="font-mono text-sm" data-testid="text-linkedin-id">{profile.sub}</p>
              </div>
              {profile.locale && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Locale
                  </Label>
                  <p className="font-medium" data-testid="text-locale">{profile.locale}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Access Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Access Token (for testing)
                </Label>
                <Button
                  onClick={handleCopyToken}
                  variant="ghost"
                  size="sm"
                  data-testid="button-copy-token"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="bg-muted rounded-md p-3 border">
                <code className="text-xs font-mono break-all block" data-testid="text-access-token">
                  {accessToken}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Access your posts and manage scheduled content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4 space-y-2"
                onClick={() => navigate("/posts")}
                data-testid="button-view-posts"
              >
                <div className="flex items-center gap-2 w-full">
                  <List className="w-5 h-5" />
                  <span className="font-semibold">My Posts</span>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  View all your LinkedIn posts with analytics (likes, comments) and repost functionality
                </p>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4 space-y-2"
                onClick={() => navigate("/scheduled")}
                data-testid="button-view-scheduled"
              >
                <div className="flex items-center gap-2 w-full">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">Scheduled Posts</span>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  Schedule posts for future dates and manage your content calendar
                </p>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Post Creation Section */}
        <Card data-testid="card-post-creation">
          <CardHeader>
            <CardTitle>Share on LinkedIn</CardTitle>
            <CardDescription>
              Create a text post that will be shared to your LinkedIn profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-content">Post Content</Label>
              <Textarea
                id="post-content"
                placeholder="What would you like to share?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                className="min-h-32 resize-none"
                maxLength={3000}
                data-testid="input-post-content"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {postText.length} / 3000 characters
                </p>
                <Button
                  onClick={handleCreatePost}
                  disabled={createPostMutation.isPending || !postText.trim()}
                  data-testid="button-submit-post"
                >
                  {createPostMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Share Post
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 rounded-md p-4 border-l-4 border-l-primary">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> This will create a real post on your LinkedIn profile.
                Make sure your LinkedIn app has the "Share on LinkedIn" product enabled.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
