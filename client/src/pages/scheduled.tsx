import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createScheduledPostSchema, type CreateScheduledPost } from "@shared/schema";

interface ScheduledPost {
  id: string;
  userId: string;
  content: string;
  scheduledTime: string;
  status: "pending" | "posted" | "failed";
  createdAt: string;
  postedAt: string | null;
  errorMessage: string | null;
}

export default function ScheduledPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch user profile
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
  });

  // Fetch scheduled posts
  const { data: scheduledPosts, isLoading: postsLoading } = useQuery<ScheduledPost[]>({
    queryKey: ["/api/posts/scheduled"],
    enabled: !!user,
  });

  // Form for creating scheduled posts
  const form = useForm<CreateScheduledPost>({
    resolver: zodResolver(createScheduledPostSchema),
    defaultValues: {
      content: "",
      scheduledTime: "",
    },
  });

  // Schedule post mutation
  const scheduleMutation = useMutation({
    mutationFn: async (data: CreateScheduledPost) => {
      return apiRequest("POST", "/api/posts/schedule", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post scheduled successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/scheduled"] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to schedule post",
      });
    },
  });

  // Delete scheduled post mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/posts/scheduled/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Scheduled post deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/scheduled"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete scheduled post",
      });
    },
  });

  const onSubmit = (data: CreateScheduledPost) => {
    scheduleMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this scheduled post?")) {
      deleteMutation.mutate(id);
    }
  };

  if (!user && !userLoading) {
    navigate("/");
    return null;
  }

  // Helper function to get minimum datetime (current time + 5 minutes)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Scheduled Posts</h1>
            <p className="text-muted-foreground mt-1">
              Schedule posts to be published at a specific time
            </p>
          </div>
          <Button onClick={() => navigate("/profile")} variant="outline" data-testid="button-back-profile">
            Back to Profile
          </Button>
        </div>

        {/* Schedule New Post Form */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule a New Post</CardTitle>
            <CardDescription>
              Create a post to be published at a future date and time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What do you want to share?"
                          className="min-h-[120px]"
                          maxLength={3000}
                          data-testid="textarea-scheduled-content"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/3000 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Date & Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          min={getMinDateTime()}
                          data-testid="input-scheduled-time"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Select when this post should be published (local time)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={scheduleMutation.isPending}
                  className="w-full"
                  data-testid="button-schedule-post"
                >
                  {scheduleMutation.isPending ? "Scheduling..." : "Schedule Post"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Important Note About Scheduling */}
        <Card className="bg-muted/50 border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Important: Scheduled Posting Limitation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Due to LinkedIn API access token limitations, scheduled posts cannot be automatically published
              when their scheduled time arrives.
            </p>
            <p>
              <strong>You'll need to manually post</strong> scheduled items from this page when their time comes.
              This is a limitation of LinkedIn's OAuth2 system which doesn't support long-lived tokens for
              automated posting.
            </p>
          </CardContent>
        </Card>

        {/* Scheduled Posts List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Scheduled Posts</h2>

          {postsLoading ? (
            // Loading skeleton
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))
          ) : scheduledPosts && scheduledPosts.length > 0 ? (
            scheduledPosts.map((post) => (
              <Card key={post.id} data-testid={`card-scheduled-${post.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {post.status === "pending" && (
                          <Badge variant="secondary" data-testid={`status-${post.id}`}>
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {post.status === "posted" && (
                          <Badge variant="default" className="bg-green-600" data-testid={`status-${post.id}`}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Posted
                          </Badge>
                        )}
                        {post.status === "failed" && (
                          <Badge variant="destructive" data-testid={`status-${post.id}`}>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base line-clamp-2">
                        {post.content}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Calendar className="w-4 h-4" />
                        Scheduled for:{" "}
                        {new Date(post.scheduledTime).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </CardDescription>
                      {post.errorMessage && (
                        <p className="text-sm text-destructive mt-2">
                          Error: {post.errorMessage}
                        </p>
                      )}
                    </div>
                    {post.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(post.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${post.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No scheduled posts yet. Schedule your first post above!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
