import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal, Settings, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from "date-fns";

interface ScheduledPost {
  id: string;
  userId: string;
  content: string;
  scheduledTime: string;
  status: "pending" | "posted" | "failed";
}

export default function CalendarPage() {
  const [view, setView] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: scheduledPosts } = useQuery<ScheduledPost[]>({
    queryKey: ["/api/posts/scheduled"],
  });

  const startDate = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const monthDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

  function endOfWeek(date: Date) {
    return addDays(startOfWeek(date), 6);
  }

  const postsByDate = (date: Date) => {
    return scheduledPosts?.filter(post => {
      if (!post.scheduledTime) return false;
      const postDate = new Date(post.scheduledTime);
      return isSameDay(postDate, date);
    }) || [];
  };

  const getTimeSlotPosts = (date: Date, hour: number) => {
    return postsByDate(date).filter(post => {
      const postDate = new Date(post.scheduledTime);
      return postDate.getHours() === hour;
    });
  };

  const hours = Array.from({ length: 24 }).map((_, i) => i);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-500">Manage your content calendar from here.</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-full border-slate-200 text-slate-600 font-bold h-10">
          <Settings className="w-4 h-4" />
          Time Slot Settings
        </Button>
      </header>

      {/* Toolbar */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">
            {format(currentDate, "MMMM yyyy")}
            <span className="text-slate-400 font-medium ml-2 text-sm">Week {format(currentDate, "w")} • America/Denver</span>
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="h-8 px-4 rounded-full bg-white shadow-sm font-bold text-sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200">
            <Button 
              variant={view === "week" ? "default" : "ghost"} 
              className={`h-8 px-4 rounded-full text-sm font-bold gap-2 ${view === "week" ? "bg-[#00a0dc]" : "text-slate-500"}`}
              onClick={() => setView("week")}
            >
              <CalendarIcon className="w-4 h-4" />
              Week
            </Button>
            <Button 
              variant={view === "month" ? "default" : "ghost"} 
              className={`h-8 px-4 rounded-full text-sm font-bold gap-2 ${view === "month" ? "bg-[#00a0dc]" : "text-slate-500"}`}
              onClick={() => setView("month")}
            >
              <CalendarIcon className="w-4 h-4" />
              Month
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[1000px] flex flex-col">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-20">
            {weekDays.map(day => (
              <div key={day.toString()} className="py-3 text-center border-r border-slate-100 last:border-r-0">
                <span className={`text-[11px] font-bold uppercase tracking-widest ${isToday(day) ? 'text-[#00a0dc]' : 'text-slate-400'}`}>
                  {format(day, "EEE d")}
                </span>
                {isToday(day) && (
                  <div className="mt-1 flex justify-center">
                    <div className="h-1 w-8 bg-[#00a0dc] rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-7 divide-x divide-slate-100">
            {weekDays.map(day => (
              <div key={day.toString()} className="flex flex-col p-2 gap-2 bg-white min-h-[800px]">
                {hours.map(hour => {
                  const hourPosts = getTimeSlotPosts(day, hour);
                  return (
                    <div key={hour} className="group min-h-[60px] relative">
                      <div className="text-[10px] font-bold text-slate-300 mb-1 group-hover:text-slate-400 transition-colors">
                        {format(new Date().setHours(hour, 0), "h:00 aa")}
                      </div>
                      {hourPosts.length > 0 ? (
                        <div className="space-y-1">
                          {hourPosts.map(post => (
                            <Card key={post.id} className="border-blue-100 shadow-sm bg-blue-50/50 hover:bg-blue-100/50 transition-colors cursor-pointer">
                              <CardContent className="p-2">
                                <p className="text-[11px] font-medium text-slate-700 line-clamp-2 leading-tight">
                                  {post.content}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    post.status === 'posted' ? 'bg-green-500' : 
                                    post.status === 'failed' ? 'bg-red-500' : 'bg-blue-400'
                                  }`} />
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{post.status}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full border-t border-dashed border-slate-50 group-hover:border-slate-100 transition-colors" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
