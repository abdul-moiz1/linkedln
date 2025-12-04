import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, MessageSquare, Repeat2, ExternalLink, RefreshCw, Loader2, Heart, Lightbulb, PartyPopper, Laugh, HandHeart, ArrowLeft, Link } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SessionUser } from "@shared/schema";

interface PostAuthor {
  firstName: string;
  lastName: string;
  fullName: string;
  headline: string;
  username: string;
  profileUrl: string;
  profilePicture: string | null;
}

interface PostStats {
  totalReactions: number;
  likes: number;
  support: number;
  love: number;
  insight: number;
  celebrate: number;
  funny: number;
  comments: number;
  reposts: number;
}

interface ResharedPost {
  text: string;
  postedAt: number | null;
  author: {
    firstName: string;
    lastName: string;
    fullName: string;
    headline: string;
    profilePicture: string | null;
  } | null;
}

interface ApifyPost {
  id: string;
  urn: string | null;
  text: string;
  url: string;
  postType: string;
  postedAt: number;
  postedAtRelative: string;
  author: PostAuthor | null;
  stats: PostStats;
  images: string[];
  resharedPost: ResharedPost | null;
}

export default function PostsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<"recent" | "likes" | "viral">("recent");
  const [repostDialogOpen, setRepostDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ApifyPost | null>(null);
  const [repostCommentary, setRepostCommentary] = useState("");
  
  const [posts, setPosts] = useState<ApifyPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");
  const [profileUrlInput, setProfileUrlInput] = useState("");

  const { data: user, isLoading: userLoading } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
  });

  // Check if user already has a profile URL saved and auto-fetch posts
  useEffect(() => {
    if (user && user.profileUrl) {
      setProfileUrl(user.profileUrl);
      fetchPosts(user.profileUrl);
    }
  }, [user]);

  const fetchPosts = async (url?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userId = user?.profile?.sub;
      const urlToUse = url || profileUrl;
      
      const response = await fetch("/api/posts/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          profileUrl: urlToUse,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPosts(data.posts);
        setHasFetched(true);
        toast({
          title: "Posts loaded",
          description: data.fromCache 
            ? `Loaded ${data.posts.length} posts from cache` 
            : `Fetched ${data.posts.length} new posts`,
        });
      } else {
        setError(data.error || data.message || "Failed to fetch posts");
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || data.error || "Failed to fetch posts",
        });
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to fetch posts",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfileUrl = () => {
    if (!profileUrlInput.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid LinkedIn profile URL",
      });
      return;
    }
    setProfileUrl(profileUrlInput.trim());
    fetchPosts(profileUrlInput.trim());
  };

  const sortedPosts = [...posts].sort((a, b) => {
    switch (sortBy) {
      case "likes":
        return b.stats.likes - a.stats.likes;
      case "viral":
        // Viral formula: likes * 2 + comments * 3 + impressions * 0.1
        // Note: impressions may not be available, using totalReactions as fallback
        const impressionsA = (a as any).stats.impressions || a.stats.totalReactions;
        const impressionsB = (b as any).stats.impressions || b.stats.totalReactions;
        const viralA = (a.stats.likes * 2) + (a.stats.comments * 3) + (impressionsA * 0.1);
        const viralB = (b.stats.likes * 2) + (b.stats.comments * 3) + (impressionsB * 0.1);
        return viralB - viralA;
      default:
        return b.postedAt - a.postedAt;
    }
  });

  const repostMutation = useMutation({
    mutationFn: async ({ urn, commentary }: { urn: string; commentary?: string }) => {
      return apiRequest("POST", `/api/posts/${encodeURIComponent(urn)}/repost`, { commentary });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post reshared successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setRepostDialogOpen(false);
      setSelectedPost(null);
      setRepostCommentary("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to repost",
      });
    },
  });

  const handleRepost = (post: ApifyPost) => {
    if (!post.urn) {
      toast({
        variant: "destructive",
        title: "Cannot Repost",
        description: "This post cannot be reshared because the LinkedIn URN is not available.",
      });
      return;
    }
    setSelectedPost(post);
    setRepostDialogOpen(true);
  };

  const handleRepostSubmit = () => {
    if (selectedPost?.urn) {
      repostMutation.mutate({
        urn: selectedPost.urn,
        commentary: repostCommentary.trim() || undefined,
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (author: PostAuthor | null) => {
    if (!author) return "?";
    return `${author.firstName?.[0] || ""}${author.lastName?.[0] || ""}`.toUpperCase() || "?";
  };

  if (!user && !userLoading) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate("/profile")} 
              variant="ghost" 
              size="icon"
              data-testid="button-back-profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">My Posts</h1>
              <p className="text-sm text-muted-foreground">
                View your LinkedIn posts with analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[140px]" data-testid="select-sort-posts">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="likes">Most Liked</SelectItem>
                <SelectItem value="viral">Most Viral</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => fetchPosts()} 
              disabled={isLoading || !profileUrl}
              data-testid="button-fetch-posts"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {hasFetched ? "Refresh" : "Load Posts"}
                </>
              )}
            </Button>
          </div>
        </div>

        {!profileUrl && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Link className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium">Connect Your LinkedIn Profile</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your LinkedIn profile URL to fetch and analyze your posts.
              </p>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="text"
                  placeholder="https://www.linkedin.com/in/your-username"
                  value={profileUrlInput}
                  onChange={(e) => setProfileUrlInput(e.target.value)}
                  className="flex-1 min-w-[250px]"
                  data-testid="input-profile-url"
                />
                <Button 
                  onClick={handleSaveProfileUrl}
                  disabled={isLoading || !profileUrlInput.trim()}
                  data-testid="button-save-profile-url"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    "Save & Fetch Posts"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {profileUrl && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link className="w-4 h-4" />
            <span>Profile: {profileUrl}</span>
          </div>
        )}

        {error && (
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="pt-4">
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Make sure APIFY_TOKEN and APIFY_TASK_ID are configured.
              </p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {sortedPosts.map((post, index) => (
              <Card key={post.id || index} className="overflow-hidden" data-testid={`card-post-${index}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      {post.author?.profilePicture && (
                        <AvatarImage 
                          src={post.author.profilePicture} 
                          alt={post.author.fullName}
                        />
                      )}
                      <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                        {getInitials(post.author)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm leading-tight">
                            {post.author?.fullName || "Unknown"}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {post.author?.headline || ""}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {post.postedAtRelative || formatDate(post.postedAt)}
                            </span>
                            {post.postType === "repost" && (
                              <Badge variant="secondary" className="text-xs py-0 px-1.5">
                                Repost
                              </Badge>
                            )}
                          </div>
                        </div>
                        {post.url && (
                          <a 
                            href={post.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground"
                            data-testid={`link-view-post-${index}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {post.text && (
                    <p className="text-sm whitespace-pre-wrap" data-testid={`text-post-content-${index}`}>
                      {post.text.length > 300 
                        ? `${post.text.slice(0, 300)}...` 
                        : post.text
                      }
                    </p>
                  )}

                  {post.resharedPost && (
                    <div className="border rounded-lg p-3 bg-muted/50 space-y-2">
                      {post.resharedPost.author && (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            {post.resharedPost.author.profilePicture && (
                              <AvatarImage 
                                src={post.resharedPost.author.profilePicture} 
                                alt={post.resharedPost.author.fullName}
                              />
                            )}
                            <AvatarFallback className="bg-gray-500 text-white text-xs">
                              {post.resharedPost.author.firstName?.[0]}{post.resharedPost.author.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium">{post.resharedPost.author.fullName}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {post.resharedPost.author.headline}
                            </p>
                          </div>
                        </div>
                      )}
                      {post.resharedPost.text && (
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {post.resharedPost.text}
                        </p>
                      )}
                    </div>
                  )}

                  {post.images && post.images.length > 0 && (
                    <div className={`grid gap-1 rounded-lg overflow-hidden ${
                      post.images.length === 1 ? 'grid-cols-1' : 
                      post.images.length === 2 ? 'grid-cols-2' : 
                      'grid-cols-2'
                    }`}>
                      {post.images.slice(0, 4).map((img, imgIndex) => (
                        <div 
                          key={imgIndex} 
                          className={`relative ${
                            post.images.length === 1 ? 'aspect-video' : 'aspect-square'
                          }`}
                        >
                          <img 
                            src={img} 
                            alt={`Post image ${imgIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {imgIndex === 3 && post.images.length > 4 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-white text-xl font-semibold">
                                +{post.images.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      {post.stats.likes > 0 && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white">
                          <ThumbsUp className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {post.stats.love > 0 && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white -ml-1">
                          <Heart className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {post.stats.celebrate > 0 && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white -ml-1">
                          <PartyPopper className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {post.stats.insight > 0 && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-white -ml-1">
                          <Lightbulb className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {post.stats.support > 0 && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-500 text-white -ml-1">
                          <HandHeart className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {post.stats.funny > 0 && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white -ml-1">
                          <Laugh className="w-2.5 h-2.5" />
                        </span>
                      )}
                      <span className="ml-1">{post.stats.totalReactions}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{post.stats.comments} comments</span>
                      <span>{post.stats.reposts} reposts</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-around pt-1 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 text-muted-foreground"
                      data-testid={`button-like-${index}`}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Like
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 text-muted-foreground"
                      data-testid={`button-comment-${index}`}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Comment
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 text-muted-foreground"
                      onClick={() => handleRepost(post)}
                      disabled={repostMutation.isPending || !post.urn}
                      title={!post.urn ? "URN not available for reposting" : "Repost this content"}
                      data-testid={`button-repost-${index}`}
                    >
                      <Repeat2 className="w-4 h-4 mr-2" />
                      Repost
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <RefreshCw className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No posts loaded yet</h3>
              <p className="text-muted-foreground text-center text-sm mb-6 max-w-sm">
                Click the button below to fetch your LinkedIn posts with engagement analytics.
              </p>
              <Button onClick={() => fetchPosts()} disabled={isLoading || !profileUrl} data-testid="button-fetch-posts-empty">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Load My Posts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={repostDialogOpen} onOpenChange={setRepostDialogOpen}>
        <DialogContent data-testid="dialog-repost">
          <DialogHeader>
            <DialogTitle>Repost to LinkedIn</DialogTitle>
            <DialogDescription>
              Reshare this post to your LinkedIn feed. Optionally add your thoughts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Add your thoughts (optional)..."
              value={repostCommentary}
              onChange={(e) => setRepostCommentary(e.target.value)}
              maxLength={3000}
              rows={4}
              data-testid="textarea-repost-commentary"
            />
            <p className="text-xs text-muted-foreground">
              {repostCommentary.length}/3000 characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRepostDialogOpen(false)}
              data-testid="button-cancel-repost"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRepostSubmit}
              disabled={repostMutation.isPending}
              data-testid="button-submit-repost"
            >
              {repostMutation.isPending ? "Reposting..." : "Repost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
