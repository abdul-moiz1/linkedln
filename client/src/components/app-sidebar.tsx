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
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

const menuItems = [
  { group: "Main", items: [
    { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
    { title: "Settings", icon: Settings, url: "/settings" },
    { title: "Analytics", icon: BarChart3, url: "/analytics" },
  ]},
  { group: "Content Creation", items: [
    { title: "PostCast", icon: Mic, url: "/postcast", badge: "BETA" },
    { title: "Post Generator", icon: PenTool, url: "/posts" },
    { title: "Carousel Maker", icon: Layers, url: "/create" },
    { title: "Voice Notes", icon: Mic, url: "/voice-notes" },
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
  const { data: user } = useQuery({ queryKey: ["/api/user"] });

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

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4">
        <Button 
          className="w-full bg-[#00a0dc] hover:bg-[#008dbf] text-white rounded-full h-11 flex items-center justify-center gap-2"
          onClick={() => setLocation("/create")}
        >
          <PlusCircle className="w-5 h-5" />
          <span className="font-semibold">Write Post</span>
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {menuItems.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.url}
                      className="hover:bg-accent/50 rounded-lg transition-colors"
                    >
                      <button onClick={() => setLocation(item.url)} className="flex items-center gap-3 w-full py-2">
                        <item.icon className="w-5 h-5" />
                        <span className="flex-1 text-sm font-medium">{item.title}</span>
                        {item.badge && (
                          <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
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

      <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border">
        <div className="flex items-center gap-3 w-full">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={user?.profile?.picture} />
            <AvatarFallback>{user?.profile?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.profile?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.profile?.email}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
