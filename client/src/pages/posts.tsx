import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageSquare, Share2, Clock, TrendingUp, Eye, ExternalLink, RefreshCw, Loader2, Link2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SessionUser } from "@shared/schema";

interface ApifyPost {
  id: string;
  text: string;
  image: string | null;
  url: string;
  createdAt: number;
  likes: number;
  comments: number;
  impressions: number;
}

interface LinkedInPost {
  id: string;
  author: string;
  commentary?: string;
  publishedAt?: number;
  lifecycleState?: string;
  visibility?: string;
  reshareContext?: {
    parent: string;
    root?: string;
  };
}

interface PostAnalytics {
  postId: string;
  likesSummary: {
    totalLikes: number;
    likedByCurrentUser?: boolean;
  };
  commentsSummary: {
    totalFirstLevelComments: number;
    aggregatedTotalComments?: number;
  };
}

interface PostWithAnalytics extends LinkedInPost {
  analytics?: PostAnalytics;
}

export default function PostsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<"recent" | "likes" | "viral">("recent");
  const [repostDialogOpen, setRepostDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [repostCommentary, setRepostCommentary] = useState("");
  
  const [apifyPosts, setApifyPosts] = useState<ApifyPost[]>([]);
  const [apifyLoading, setApifyLoading] = useState(false);
  const [apifyError, setApifyError] = useState<string | null>(null);
  const [useApify, setUseApify] = useState(false);
  const [fetchDialogOpen, setFetchDialogOpen] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");

  const { data: user, isLoading: userLoading } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
  });

  const { data: posts, isLoading: postsLoading } = useQuery<LinkedInPost[]>({
    queryKey: ["/api/posts"],
    enabled: !!user && !useApify,
  });

  const [postsWithAnalytics, setPostsWithAnalytics] = useState<PostWithAnalytics[]>([]);
  const [analyticsError, setAnalyticsError] = useState<boolean>(false);
  
  useEffect(() => {
    if (posts && !useApify) {
      let hasError = false;
      Promise.all(
        posts.map(async (post) => {
          try {
            const response = await fetch(`/api/posts/${encodeURIComponent(post.id)}/analytics`, {
              credentials: "include",
            });
            if (response.ok) {
              const analytics = await response.json();
              return { ...post, analytics };
            } else {
              console.warn(`Analytics unavailable for post ${post.id}: ${response.status}`);
              hasError = true;
              return post;
            }
          } catch (error) {
            console.error(`Failed to fetch analytics for post ${post.id}:`, error);
            hasError = true;
            return post;
          }
        })
      ).then((postsWithAnalytics) => {
        setPostsWithAnalytics(postsWithAnalytics);
        setAnalyticsError(hasError);
      });
    } else if (!useApify) {
      setPostsWithAnalytics([]);
      setAnalyticsError(false);
    }
  }, [posts, useApify]);

  const fetchApifyPosts = async () => {
    if (!profileUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your LinkedIn profile URL",
      });
      return;
    }

    let normalizedUrl = profileUrl.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://www.linkedin.com/in/${normalizedUrl}`;
    }
    
    setApifyLoading(true);
    setApifyError(null);
    setFetchDialogOpen(false);
    
    try {
      const response = await fetch("/api/posts/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profileUrl: normalizedUrl })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setApifyPosts(data.posts);
        setUseApify(true);
        toast({
          title: "Posts loaded",
          description: `Found ${data.posts.length} posts from your LinkedIn profile`,
        });
      } else {
        setApifyError(data.error || data.message || "Failed to fetch posts");
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || data.error || "Failed to fetch posts",
        });
      }
    } catch (error: any) {
      setApifyError(error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch posts",
      });
    } finally {
      setApifyLoading(false);
    }
  };

  const sortedApifyPosts = [...apifyPosts].sort((a, b) => {
    switch (sortBy) {
      case "likes":
        return b.likes - a.likes;
      case "viral":
        const viralA = (a.likes * 2 + a.comments * 3 + a.impressions * 0.1);
        const viralB = (b.likes * 2 + b.comments * 3 + b.impressions * 0.1);
        return viralB - viralA;
      default:
        return b.createdAt - a.createdAt;
    }
  });

  const sortedLinkedInPosts = postsWithAnalytics ? [...postsWithAnalytics].sort((a, b) => {
    if (sortBy === "likes") {
      const aLikes = a.analytics?.likesSummary?.totalLikes || 0;
      const bLikes = b.analytics?.likesSummary?.totalLikes || 0;
      return bLikes - aLikes;
    } else if (sortBy === "viral") {
      const aLikes = a.analytics?.likesSummary?.totalLikes || 0;
      const aComments = a.analytics?.commentsSummary?.totalFirstLevelComments || 0;
      const bLikes = b.analytics?.likesSummary?.totalLikes || 0;
      const bComments = b.analytics?.commentsSummary?.totalFirstLevelComments || 0;
      const viralA = (aLikes * 2 + aComments * 3);
      const viralB = (bLikes * 2 + bComments * 3);
      return viralB - viralA;
    } else {
      const aTime = a.publishedAt || 0;
      const bTime = b.publishedAt || 0;
      return bTime - aTime;
    }
  }) : [];

  const repostMutation = useMutation({
    mutationFn: async ({ postId, commentary }: { postId: string; commentary?: string }) => {
      return apiRequest("POST", `/api/posts/${encodeURIComponent(postId)}/repost`, { commentary });
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

  const handleRepost = (postId: string) => {
    setSelectedPost(postId);
    setRepostDialogOpen(true);
  };

  const handleRepostSubmit = () => {
    if (selectedPost) {
      repostMutation.mutate({
        postId: selectedPost,
        commentary: repostCommentary.trim() || undefined,
      });
    }
  };

  if (!user && !userLoading) {
    navigate("/");
    return null;
  }

  const isLoading = useApify ? apifyLoading : postsLoading;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My LinkedIn Posts</h1>
            <p className="text-muted-foreground mt-1">
              View your posts with engagement analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setFetchDialogOpen(true)} 
              variant="outline"
              disabled={apifyLoading}
              data-testid="button-fetch-apify"
            >
              {apifyLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Fetch via Scraper
                </>
              )}
            </Button>
            <Button onClick={() => navigate("/profile")} variant="outline" data-testid="button-back-profile">
              Back to Profile
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <CardTitle className="text-base">Filter Posts</CardTitle>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]" data-testid="select-sort-posts">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="likes">Most Liked</SelectItem>
                <SelectItem value="viral">Most Viral</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
        </Card>

        {useApify && apifyPosts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedApifyPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden" data-testid={`card-apify-post-${post.id}`}>
                {post.image && (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={post.image} 
                      alt="Post image"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-sm line-clamp-4" data-testid={`text-post-content-${post.id}`}>
                    {post.text || "No content"}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground border-t pt-4">
                  <div className="flex items-center gap-1" data-testid={`likes-${post.id}`}>
                    <ThumbsUp className="w-4 h-4" />
                    <span>{post.likes}</span>
                  </div>
                  <div className="flex items-center gap-1" data-testid={`comments-${post.id}`}>
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.comments}</span>
                  </div>
                  {post.impressions > 0 && (
                    <div className="flex items-center gap-1" data-testid={`impressions-${post.id}`}>
                      <Eye className="w-4 h-4" />
                      <span>{post.impressions}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    {post.url && (
                      <a 
                        href={post.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                        data-testid={`link-view-post-${post.id}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </a>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-video w-full" />
                    <CardHeader>
                      <Skeleton className="h-4 w-1/3" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                    <CardFooter className="border-t pt-4">
                      <Skeleton className="h-4 w-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : sortedLinkedInPosts && sortedLinkedInPosts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {sortedLinkedInPosts.map((post) => (
                  <Card key={post.id} data-testid={`card-post-${post.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-base line-clamp-2">
                            {post.commentary || "No content"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-2">
                            <Clock className="w-4 h-4" />
                            {post.publishedAt 
                              ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Unknown date"}
                            {post.reshareContext && (
                              <Badge variant="secondary" className="ml-2">Reshare</Badge>
                            )}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRepost(post.id)}
                          disabled={repostMutation.isPending}
                          data-testid={`button-repost-${post.id}`}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Repost
                        </Button>
                      </div>
                    </CardHeader>

                    <CardFooter className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                      {post.analytics ? (
                        <>
                          <div className="flex items-center gap-1" data-testid={`likes-${post.id}`}>
                            <ThumbsUp className="w-4 h-4" />
                            <span>{post.analytics.likesSummary.totalLikes} likes</span>
                          </div>
                          <div className="flex items-center gap-1" data-testid={`comments-${post.id}`}>
                            <MessageSquare className="w-4 h-4" />
                            <span>{post.analytics.commentsSummary.totalFirstLevelComments} comments</span>
                          </div>
                          <div className="flex items-center gap-1 ml-auto">
                            <TrendingUp className="w-4 h-4" />
                            <span>
                              {post.analytics.likesSummary.totalLikes + 
                               post.analytics.commentsSummary.totalFirstLevelComments} engagement
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground text-center mb-4">
                    No posts found. Try fetching posts using the scraper or create your first post from the Profile page!
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={() => setFetchDialogOpen(true)} disabled={apifyLoading} data-testid="button-fetch-posts-empty">
                      {apifyLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        "Fetch Posts"
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/profile")} data-testid="button-create-first-post">
                      Go to Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {apifyError && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {apifyError}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Make sure APIFY_TOKEN is configured in your environment secrets.
              </p>
            </CardContent>
          </Card>
        )}

        {analyticsError && !useApify && (
          <Card className="bg-destructive/10 border-destructive/50">
            <CardContent className="pt-4">
              <p className="text-sm text-destructive">
                Some analytics data failed to load. This may be due to API rate limits or permissions issues.
              </p>
            </CardContent>
          </Card>
        )}

        {!useApify && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analytics Note
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                LinkedIn API provides <strong>likes and comments</strong> for personal posts.
              </p>
              <p>
                For full analytics (impressions, clicks, shares), use the <strong>"Fetch via Scraper"</strong> button 
                which uses Apify's LinkedIn Post Scraper.
              </p>
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

      <Dialog open={fetchDialogOpen} onOpenChange={setFetchDialogOpen}>
        <DialogContent data-testid="dialog-fetch-posts">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Fetch LinkedIn Posts
            </DialogTitle>
            <DialogDescription>
              Enter your LinkedIn profile URL to fetch your posts with engagement analytics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-url">LinkedIn Profile URL</Label>
              <Input
                id="profile-url"
                placeholder="https://www.linkedin.com/in/yourprofile"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                data-testid="input-profile-url"
              />
              <p className="text-xs text-muted-foreground">
                You can also just enter your profile slug (e.g., "yourprofile")
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFetchDialogOpen(false)}
              data-testid="button-cancel-fetch"
            >
              Cancel
            </Button>
            <Button
              onClick={fetchApifyPosts}
              disabled={apifyLoading || !profileUrl.trim()}
              data-testid="button-submit-fetch"
            >
              {apifyLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                "Fetch Posts"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
