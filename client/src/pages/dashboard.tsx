import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Eye,
  TrendingUp,
  Clock,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { title: "Total Impressions", value: "12,482", icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
  { title: "Engagement Rate", value: "4.2%", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
  { title: "New Followers", value: "+154", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { title: "Total Reactions", value: "892", icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-500/10" },
];

export default function Dashboard() {
  const { data: user } = useQuery({ queryKey: ["/api/user"] });

  return (
    <div className="p-8 space-y-8 bg-background h-full overflow-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.profile?.name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your LinkedIn profile this week.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="hover-elevate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`${stat.bg} p-2 rounded-lg`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-emerald-500 font-medium">+12%</span> from last week
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest posts and their performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="bg-primary/10 p-2 rounded-lg mt-1">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      AI and quantum are transforming how we tackle...
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 2h ago</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> 1.2k views</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Upcoming Scheduled Posts</CardTitle>
            <CardDescription>Next posts set to go live on your feed.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="bg-muted p-4 rounded-full">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No scheduled posts</p>
                <p className="text-sm text-muted-foreground">Plan your content strategy ahead of time.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
