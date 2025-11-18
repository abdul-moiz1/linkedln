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
import { Copy, LogOut, Send, Check, Loader2, List, Calendar, User2, Mail, Globe, Shield } from "lucide-react";
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </div>
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
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container max-w-6xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <SiLinkedin className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">LinkedIn OAuth</h1>
              <p className="text-xs text-muted-foreground">Profile Management</p>
            </div>
          </div>
          <Button
            onClick={() => logoutMutation.mutate()}
            variant="outline"
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            {logoutMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 mr-2" />
            )}
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl py-8 px-6 space-y-6">
        {/* Profile Section */}
        <Card data-testid="card-profile" className="overflow-hidden">
          {/* Profile Header with Background */}
          <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
          
          <CardContent className="pt-0 pb-8">
            {/* Avatar and Basic Info */}
            <div className="flex flex-wrap items-start gap-6 -mt-10 mb-6">
              <Avatar className="w-28 h-28 border-4 border-card shadow-lg">
                <AvatarImage src={profile.picture} alt={profile.name || "User"} />
                <AvatarFallback className="text-2xl font-semibold bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pt-12">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-foreground" data-testid="text-profile-name">
                    {profile.name || "LinkedIn User"}
                  </h2>
                  {profile.email_verified && (
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                {profile.email && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <Mail className="w-4 h-4" />
                    <p data-testid="text-profile-email">{profile.email}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Profile Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.given_name && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User2 className="w-4 h-4" />
                    <Label className="text-xs uppercase tracking-wide font-medium">
                      First Name
                    </Label>
                  </div>
                  <p className="text-base font-medium pl-6" data-testid="text-given-name">
                    {profile.given_name}
                  </p>
                </div>
              )}
              {profile.family_name && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User2 className="w-4 h-4" />
                    <Label className="text-xs uppercase tracking-wide font-medium">
                      Last Name
                    </Label>
                  </div>
                  <p className="text-base font-medium pl-6" data-testid="text-family-name">
                    {profile.family_name}
                  </p>
                </div>
              )}
              {profile.locale && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    <Label className="text-xs uppercase tracking-wide font-medium">
                      Locale
                    </Label>
                  </div>
                  <p className="text-base font-medium pl-6" data-testid="text-locale">
                    {typeof profile.locale === 'string' 
                      ? profile.locale 
                      : `${profile.locale.language}_${profile.locale.country}`}
                  </p>
                </div>
              )}
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <SiLinkedin className="w-4 h-4" />
                  <Label className="text-xs uppercase tracking-wide font-medium">
                    LinkedIn ID
                  </Label>
                </div>
                <p className="font-mono text-sm pl-6 text-muted-foreground" data-testid="text-linkedin-id">
                  {profile.sub}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Access Token Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Access Token <span className="text-muted-foreground text-xs">(for development)</span>
                </Label>
                <Button
                  onClick={handleCopyToken}
                  variant="outline"
                  size="sm"
                  data-testid="button-copy-token"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Token
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-muted/50 rounded-md p-4 border">
                <code className="text-xs font-mono break-all block text-muted-foreground" data-testid="text-access-token">
                  {accessToken}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Quick Actions</h3>
            <p className="text-sm text-muted-foreground">Manage your LinkedIn content</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className="hover-elevate cursor-pointer transition-all" 
              onClick={() => navigate("/posts")}
              data-testid="card-quick-action-posts"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <List className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-1">My Posts</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      View all your LinkedIn posts with analytics including likes, comments, and engagement metrics
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer transition-all" 
              onClick={() => navigate("/scheduled")}
              data-testid="card-quick-action-scheduled"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-1">Scheduled Posts</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Schedule posts for future dates and manage your content calendar efficiently
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Post Creation Section */}
        <Card data-testid="card-post-creation">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Share on LinkedIn</CardTitle>
                <CardDescription>
                  Create and publish content directly to your LinkedIn profile
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="post-content" className="text-sm font-medium">What would you like to share?</Label>
              <Textarea
                id="post-content"
                placeholder="Share your thoughts, insights, or updates with your network..."
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                className="min-h-36 resize-none text-base"
                maxLength={3000}
                data-testid="input-post-content"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {postText.length} / 3,000 characters
                </p>
                <Button
                  onClick={handleCreatePost}
                  disabled={createPostMutation.isPending || !postText.trim()}
                  size="default"
                  data-testid="button-submit-post"
                >
                  {createPostMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Publish Post
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-accent/50 rounded-lg p-4 border border-accent">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Publishing to LinkedIn</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This will create a real post on your LinkedIn profile. Ensure your app has the "Share on LinkedIn" product enabled in your LinkedIn App settings.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
