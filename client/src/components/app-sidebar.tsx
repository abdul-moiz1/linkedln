import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Settings,
  BarChart3,
  PlusCircle,
  PenTool,
  Layers,
  Mic,
  Calendar,
  MousePointer2,
  TrendingUp,
  Users,
  LogOut,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { WritingStyleSidebar } from "./writing-style-sidebar";
import { CreatePostModal } from "./create-post-modal";

const menuItems = [
  { group: "Main", items: [
    { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
    { title: "Settings", icon: Settings, url: "/settings" },
    { title: "Analytics", icon: BarChart3, url: "/analytics" },
  ]},
  { group: "Content Creation", items: [
    { title: "PostCast", icon: Mic, url: "/postcast", badge: "BETA" },
    { title: "Writing Style", icon: Sparkles, url: "/writing-style" },
    { title: "Post Generator", icon: PenTool, url: "/posts" },
    { title: "Carousel Maker", icon: Layers, url: "/create" },
    { title: "Voice Notes", icon: Mic, url: "/voice-notes" },
    { title: "My LinkedIn Posts", icon: Users, url: "/profile" },
  ]},
  { group: "Engagement", items: [
    { title: "Engage", icon: MousePointer2, url: "/engage" },
  ]},
  { group: "Drafts & Scheduling", items: [
    { title: "Kanban", icon: LayoutDashboard, url: "/kanban" },
    { title: "Calendar", icon: Calendar, url: "/scheduled" },
  ]},
  { group: "Content Inspiration", items: [
    { title: "Viral Posts", icon: TrendingUp, url: "/viral" },
    { title: "Influencers", icon: Users, url: "/influencers" },
  ]}
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/");
    },
  });

  if (!user) return null;

  return (
    <Sidebar className="border-r border-sidebar-border bg-white" collapsible="none">
      <SidebarHeader className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="bg-[#00a0dc] p-1.5 rounded-lg">
             <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-[#1a1a1a]">VoicePrint</span>
        </div>
        <Button 
          className="w-full bg-[#00a0dc] hover:bg-[#008dbf] text-white rounded-xl h-12 flex items-center justify-center gap-2 shadow-sm border-none"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <PlusCircle className="w-5 h-5" />
          <span className="font-bold text-sm">Write Post</span>
        </Button>
        <CreatePostModal isOpen={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      </SidebarHeader>
      <SidebarContent className="px-2 scrollbar-none">
        {menuItems.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel className="px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-70">
              {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.url}
                      className="hover:bg-accent/50 rounded-lg transition-colors h-10 px-3 data-[active=true]:bg-blue-50 data-[active=true]:text-[#00a0dc]"
                    >
                      <button onClick={() => setLocation(item.url)} className="flex items-center gap-3 w-full">
                        <item.icon className={`w-5 h-5 ${location === item.url ? 'text-[#00a0dc]' : 'text-muted-foreground'}`} />
                        <span className="flex-1 text-sm font-semibold">{item.title}</span>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border bg-sidebar/50">
        <div className="flex items-center gap-3 w-full">
          <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
            <AvatarImage src={user?.profile?.picture} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{user?.profile?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{user?.profile?.name}</p>
            <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-tight">Free Plan</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
