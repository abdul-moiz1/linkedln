import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
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
import { Copy, Send, Check, Loader2, List, Calendar, User2, Mail, Globe, Shield, Image as ImageIcon, Video, X, ChevronDown, Smile, Plus, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SessionUser, CreatePost } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CarouselCreator from "@/components/CarouselCreator";
import Header from "@/components/Header";

type MediaFile = {
  url: string;
  type: "IMAGE" | "VIDEO";
  filename: string;
};

export default function Profile() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [postText, setPostText] = useState("");
  const [copied, setCopied] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [visibility, setVisibility] = useState<"anyone" | "connections">("anyone");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: user, isLoading } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
  });

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
      setMediaFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: file.type.startsWith("video/") 
          ? "Videos must be under 50MB" 
          : "Images must be under 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Only images and videos are supported",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const mediaType = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
      
      setMediaFiles(prev => [...prev, {
        url: base64,
        type: mediaType,
        filename: file.name,
      }]);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
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
    createPostMutation.mutate({ 
      text: postText,
      media: mediaFiles.length > 0 ? mediaFiles : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-500">Loading your profile...</p>
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header variant="app" />

      <main className="container mx-auto max-w-6xl py-8 px-4 space-y-8">
        {/* Profile Card */}
        <Card data-testid="card-profile" className="overflow-hidden border-slate-200">
          <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500" />
          
          <CardContent className="pt-0 pb-8">
            <div className="flex flex-wrap items-start gap-6 -mt-12 mb-6">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={profile.picture} alt={profile.name || "User"} />
                <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pt-14">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-slate-900" data-testid="text-profile-name">
                    {profile.name || "LinkedIn User"}
                  </h2>
                  {profile.email_verified && (
                    <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
                      <Shield className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                {profile.email && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="w-4 h-4" />
                    <p data-testid="text-profile-email">{profile.email}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
              {profile.given_name && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">First Name</p>
                  <p className="text-sm font-medium text-slate-900" data-testid="text-given-name">
                    {profile.given_name}
                  </p>
                </div>
              )}
              {profile.family_name && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Last Name</p>
                  <p className="text-sm font-medium text-slate-900" data-testid="text-family-name">
                    {profile.family_name}
                  </p>
                </div>
              )}
              {profile.locale && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Locale</p>
                  <p className="text-sm font-medium text-slate-900" data-testid="text-locale">
                    {typeof profile.locale === 'string' 
                      ? profile.locale 
                      : `${profile.locale.language}_${profile.locale.country}`}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">LinkedIn ID</p>
                <p className="text-xs font-mono text-slate-600 truncate" data-testid="text-linkedin-id">
                  {profile.sub}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className="border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group" 
            onClick={() => navigate("/posts")}
            data-testid="card-quick-action-posts"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
                  <List className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">My Posts</h4>
                  <p className="text-sm text-slate-500">View your posts with analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group" 
            onClick={() => navigate("/scheduled")}
            data-testid="card-quick-action-scheduled"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Scheduled Posts</h4>
                  <p className="text-sm text-slate-500">Manage your content calendar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Carousel Creator */}
        <CarouselCreator />

        {/* LinkedIn-Style Post Creation */}
        <Card data-testid="card-post-creation" className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            {/* Header with Avatar and Visibility */}
            <div className="flex items-start justify-between p-4 pb-0">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-slate-100">
                  <AvatarImage src={profile.picture} alt={profile.name || "User"} />
                  <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-slate-900" data-testid="text-post-author">
                    {profile.name || "LinkedIn User"}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-0 text-sm text-slate-600 font-normal gap-1"
                        data-testid="button-visibility-dropdown"
                      >
                        {visibility === "anyone" ? "Post to Anyone" : "Connections only"}
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => setVisibility("anyone")} data-testid="menu-item-anyone">
                        <Globe className="w-4 h-4 mr-2" />
                        Anyone
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setVisibility("connections")} data-testid="menu-item-connections">
                        <User2 className="w-4 h-4 mr-2" />
                        Connections only
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-slate-400"
                onClick={() => {
                  setPostText("");
                  setMediaFiles([]);
                }}
                data-testid="button-clear-post"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Text Area */}
            <div className="px-4 py-3">
              <Textarea
                id="post-content"
                placeholder="Share your thoughts..."
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                className="min-h-[180px] resize-none border-0 text-base focus-visible:ring-0 placeholder:text-slate-400"
                maxLength={3000}
                data-testid="input-post-content"
              />
            </div>

            {/* Media Preview */}
            {mediaFiles.length > 0 && (
              <div className="px-4 pb-3">
                <div className="grid grid-cols-2 gap-3">
                  {mediaFiles.map((media, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden border border-slate-200">
                      {media.type === "IMAGE" ? (
                        <img 
                          src={media.url} 
                          alt={media.filename}
                          className="w-full h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-40 flex items-center justify-center bg-slate-50">
                          <Video className="w-10 h-10 text-slate-400" />
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => removeMedia(index)}
                        data-testid={`button-remove-media-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                        {media.filename}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Toolbar */}
            <div className="border-t border-slate-100">
              {/* First Row: Emoji and Character Count */}
              <div className="flex items-center gap-2 px-4 py-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-slate-500"
                  data-testid="button-emoji"
                >
                  <Smile className="w-5 h-5" />
                </Button>
                <span className="text-sm text-slate-400" data-testid="text-char-count">
                  {postText.length}/3000
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-slate-500"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={mediaFiles.length >= 4}
                  data-testid="button-add-image"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-slate-500"
                  disabled={mediaFiles.length >= 4}
                  data-testid="button-add-more"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              {/* Second Row: Schedule and Post Button */}
              <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-slate-100">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-slate-500"
                  onClick={() => navigate("/scheduled")}
                  data-testid="button-schedule"
                >
                  <Clock className="w-5 h-5" />
                </Button>
                <Button
                  onClick={handleCreatePost}
                  disabled={createPostMutation.isPending || !postText.trim()}
                  className="rounded-full px-6 bg-blue-600 hover:bg-blue-700"
                  data-testid="button-submit-post"
                >
                  {createPostMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Developer Token Section */}
        <Card className="border-slate-200" data-testid="card-developer">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Developer Access</CardTitle>
            <CardDescription className="text-slate-500">
              Access token for development and testing purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <code className="text-xs font-mono text-slate-600 break-all" data-testid="text-access-token">
                  {accessToken}
                </code>
              </div>
              <Button
                onClick={handleCopyToken}
                variant="outline"
                size="sm"
                className="shrink-0 border-slate-200"
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
                    Copy
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
