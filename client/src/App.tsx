import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Create from "@/pages/create";
import Preview from "@/pages/preview";
import Profile from "@/pages/profile";
import WritingStyle from "@/pages/writing-style";
import Posts from "@/pages/posts";
import Scheduled from "@/pages/scheduled";
import MyCarousels from "@/pages/my-carousels";
import VoiceNotes from "@/pages/voice-notes";
import WritePost from "@/pages/write-post";
import CalendarPage from "@/pages/calendar";
import Analytics from "@/pages/analytics";
import Templates from "@/pages/templates";
import CarouselEditor from "@/pages/CarouselEditor";
import PdfPostGenerator from "@/pages/PdfPostGenerator";
import YoutubePostGenerator from "@/pages/YoutubePostGenerator";
import ArticlePostGenerator from "@/pages/ArticlePostGenerator";
import FormatContent from "@/pages/FormatContent";
import NotFound from "@/pages/not-found";
import { useQuery } from "@tanstack/react-query";

function Router() {
  const { data: user } = useQuery({ queryKey: ["/api/user"] });

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50/50">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0 relative bg-transparent overflow-y-auto">
          <Switch>
            <Route path="/onboarding" component={Onboarding} />
            <Route path="/" component={Home} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route path="/create" component={Create} />
            <Route path="/generate-posts/pdf" component={PdfPostGenerator} />
            <Route path="/generate-posts/youtube" component={YoutubePostGenerator} />
            <Route path="/generate-posts/article" component={ArticlePostGenerator} />
            <Route path="/generate-posts/format" component={FormatContent} />
            <Route path="/preview" component={Preview} />
            <Route path="/profile" component={Profile} />
            <Route path="/writing-style" component={WritingStyle} />
            <Route path="/posts" component={Posts} />
            <Route path="/posts-scrape" component={Posts} />
            <Route path="/scheduled" component={Scheduled} />
            <Route path="/my-carousels" component={MyCarousels} />
            <Route path="/voice-notes" component={VoiceNotes} />
            <Route path="/write-post" component={WritePost} />
            <Route path="/calendar" component={CalendarPage} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/templates" component={Templates} />
            <Route path="/carousel-editor/:templateId">
              <div className="fixed inset-0 z-50 bg-white">
                <CarouselEditor />
              </div>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
