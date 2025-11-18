import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageSquare, Share2, Clock, TrendingUp } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

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
  const [sortBy, setSortBy] = useState<"recent" | "likes" | "comments">("recent");
  const [repostDialogOpen, setRepostDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [repostCommentary, setRepostCommentary] = useState("");

  // Fetch user profile
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
  });

  // Fetch LinkedIn posts
  const { data: posts, isLoading: postsLoading } = useQuery<LinkedInPost[]>({
    queryKey: ["/api/posts"],
    enabled: !!user,
  });

  // Fetch analytics for all posts (avoid calling hooks in a loop)
  const [postsWithAnalytics, setPostsWithAnalytics] = useState<PostWithAnalytics[]>([]);
  const [analyticsError, setAnalyticsError] = useState<boolean>(false);
  
  // Fetch analytics for each post using useEffect
  useEffect(() => {
    if (posts) {
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
              // Non-OK response (rate limits, permissions, etc.)
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
    } else {
      setPostsWithAnalytics([]);
      setAnalyticsError(false);
    }
  }, [posts]);

  // Sort posts based on selected criteria
  const sortedPosts = postsWithAnalytics ? [...postsWithAnalytics].sort((a, b) => {
    if (sortBy === "likes") {
      const aLikes = a.analytics?.likesSummary?.totalLikes || 0;
      const bLikes = b.analytics?.likesSummary?.totalLikes || 0;
      return bLikes - aLikes;
    } else if (sortBy === "comments") {
      const aComments = a.analytics?.commentsSummary?.totalFirstLevelComments || 0;
      const bComments = b.analytics?.commentsSummary?.totalFirstLevelComments || 0;
      return bComments - aComments;
    } else {
      // Sort by recent (publishedAt)
      const aTime = a.publishedAt || 0;
      const bTime = b.publishedAt || 0;
      return bTime - aTime;
    }
  }) : [];

  // Repost mutation
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My LinkedIn Posts</h1>
            <p className="text-muted-foreground mt-1">
              View your posts with engagement analytics
            </p>
          </div>
          <Button onClick={() => navigate("/profile")} variant="outline" data-testid="button-back-profile">
            Back to Profile
          </Button>
        </div>

        {/* Sort Controls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base">Sort Posts</CardTitle>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]" data-testid="select-sort-posts">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="likes">Most Liked</SelectItem>
                <SelectItem value="comments">Most Commented</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
        </Card>

        {/* Posts List */}
        <div className="space-y-4">
          {postsLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : sortedPosts && sortedPosts.length > 0 ? (
            sortedPosts.map((post) => (
              <Card key={post.id} data-testid={`card-post-${post.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">
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

                {/* Analytics */}
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
                           post.analytics.commentsSummary.totalFirstLevelComments} total engagement
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
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  No posts found. Create your first post from the Profile page!
                </p>
                <Button className="mt-4" onClick={() => navigate("/profile")} data-testid="button-create-first-post">
                  Go to Profile
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Analytics Error Notice */}
        {analyticsError && (
          <Card className="bg-destructive/10 border-destructive/50">
            <CardContent className="pt-4">
              <p className="text-sm text-destructive">
                Some analytics data failed to load. This may be due to API rate limits or permissions issues.
              </p>
            </CardContent>
          </Card>
        )}

        {/* API Limitations Notice */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">📊 Analytics Note</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              LinkedIn API provides <strong>likes and comments</strong> for personal posts.
            </p>
            <p>
              Full analytics (impressions, clicks, shares) are only available for company pages
              with Marketing Developer Platform approval.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Repost Dialog */}
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
