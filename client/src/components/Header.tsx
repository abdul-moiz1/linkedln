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
import { SiLinkedin } from "react-icons/si";
import { Sparkles, LogOut, User, List, Calendar, ChevronDown, LayoutDashboard, Home, Plus } from "lucide-react";
import type { SessionUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface HeaderProps {
  variant?: "home" | "app";
}

export default function Header({ variant = "home" }: HeaderProps) {
  const [location, navigate] = useLocation();
  
  const { data: user, isLoading } = useQuery<SessionUser>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const handleLinkedInLogin = () => {
    window.location.href = "/auth/linkedin";
  };

  const initials = user?.profile?.name
    ? user.profile.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : user?.profile?.email?.[0]?.toUpperCase() || "U";

  const isActive = (path: string) => location === path;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => navigate("/")}
          data-testid="header-logo"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-slate-800">LinkedIn Carousel Maker</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <a 
            href="#home" 
            onClick={(e) => {
              e.preventDefault();
              if (location === "/") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                navigate("/");
              }
            }}
            className={`transition-colors font-medium ${location === "/" ? "text-blue-600" : "text-slate-600 hover:text-blue-600"}`}
            data-testid="nav-home"
          >
            Home
          </a>
          {user && (
            <a 
              href="/create" 
              onClick={(e) => {
                e.preventDefault();
                navigate("/create");
              }}
              className={`transition-colors font-medium ${location === "/create" ? "text-blue-600" : "text-slate-600 hover:text-blue-600"}`}
              data-testid="nav-dashboard"
            >
              Create
            </a>
          )}
          <a 
            href="#how-it-works" 
            onClick={(e) => {
              e.preventDefault();
              if (location !== "/") {
                navigate("/");
                setTimeout(() => {
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              } else {
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
            data-testid="nav-how-it-works"
          >
            How It Works
          </a>
          <a 
            href="#features" 
            onClick={(e) => {
              e.preventDefault();
              if (location !== "/") {
                navigate("/");
                setTimeout(() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              } else {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
            data-testid="nav-features"
          >
            Features
          </a>
          
          {!user ? (
            <Button 
              onClick={() => navigate("/login")}
              variant="outline"
              className="gap-2"
              data-testid="button-login"
            >
              Login
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="gap-2 pl-2 pr-3"
                  data-testid="button-user-menu"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.profile?.picture} alt={user.profile?.name || "User"} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline text-sm font-medium text-slate-700">
                    {user.profile?.given_name || user.profile?.name?.split(" ")[0] || "User"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => navigate("/create")}
                  className="gap-2 cursor-pointer"
                  data-testid="menu-create"
                >
                  <Plus className="w-4 h-4" />
                  Create Carousel
                </DropdownMenuItem>
                {user.authProvider === "linkedin" && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => navigate("/profile")}
                      className="gap-2 cursor-pointer"
                      data-testid="menu-profile"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/posts")}
                      className="gap-2 cursor-pointer"
                      data-testid="menu-posts"
                    >
                      <List className="w-4 h-4" />
                      My Posts
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/scheduled")}
                      className="gap-2 cursor-pointer"
                      data-testid="menu-scheduled"
                    >
                      <Calendar className="w-4 h-4" />
                      Scheduled Posts
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        <div className="md:hidden">
          {!user ? (
            <Button 
              onClick={() => navigate("/login")}
              variant="outline"
              className="gap-2"
              data-testid="button-login-mobile"
            >
              Login
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.profile?.picture} alt={user.profile?.name || "User"} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => navigate("/")}
                  className="gap-2 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  Home
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate("/create")}
                  className="gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create Carousel
                </DropdownMenuItem>
                {user.authProvider === "linkedin" && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => navigate("/profile")}
                      className="gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/posts")}
                      className="gap-2 cursor-pointer"
                    >
                      <List className="w-4 h-4" />
                      My Posts
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/scheduled")}
                      className="gap-2 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      Scheduled Posts
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
