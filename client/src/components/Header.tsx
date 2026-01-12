import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, LogOut, ChevronDown, Layers, Plus } from "lucide-react";
import type { SessionUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Header() {
  const [location, navigate] = useLocation();
  
  const { data: user } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });

  const initials = user?.profile?.name
    ? user.profile.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : user?.profile?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => navigate("/")}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Carousel.AI</span>
        </div>
        
        <nav className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-200">
            <a href="#how-it-works" className="hover:text-primary transition-colors">Process</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          </div>
          
          {!user ? (
            <Button 
              onClick={() => navigate("/login")}
              size="sm"
              className="rounded-full px-6 bg-white text-slate-900 hover:bg-slate-100 hover:scale-105 transition-all shadow-lg shadow-white/10"
            >
              Get Started
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 outline-none">
                  <Avatar className="w-8 h-8 border">
                    <AvatarImage src={user.profile?.picture} />
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl">
                <DropdownMenuItem onClick={() => navigate("/create")} className="gap-2 py-2.5">
                  <Plus className="w-4 h-4" /> Create New
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/my-carousels")} className="gap-2 py-2.5">
                  <Layers className="w-4 h-4" /> My Library
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  className="gap-2 py-2.5 text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}
