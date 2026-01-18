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
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <div className="bg-slate-100 px-3 py-1 rounded-md border border-slate-200 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">k</span>
          <span className="text-xs font-bold text-slate-700">{user?.profile?.name || "My"}'s Workspace</span>
          <span className="text-[10px] text-slate-400 font-medium bg-slate-200/50 px-1.5 rounded">(Admin)</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" className="rounded-full h-8 text-xs font-bold border-slate-200 text-slate-600 gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          AI Assistant
        </Button>
        <Avatar className="w-8 h-8 border">
          <AvatarImage src={user?.profile?.picture} />
          <AvatarFallback className="text-[10px] bg-slate-100 font-bold">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
