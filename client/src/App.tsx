import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Create from "@/pages/create";
import Preview from "@/pages/preview";
import Profile from "@/pages/profile";
import Posts from "@/pages/posts";
import Scheduled from "@/pages/scheduled";
import MyCarousels from "@/pages/my-carousels";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/create" component={Create} />
      <Route path="/preview" component={Preview} />
      <Route path="/profile" component={Profile} />
      <Route path="/posts" component={Posts} />
      <Route path="/scheduled" component={Scheduled} />
      <Route path="/my-carousels" component={MyCarousels} />
      <Route component={NotFound} />
    </Switch>
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
