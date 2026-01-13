import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  Users, 
  Link as LinkIcon, 
  ExternalLink, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  ChevronDown,
  Globe,
  Settings,
  Plus,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { SessionUser } from "@shared/schema";

const demoChartData = [
  { name: '16 Nov', followers: 600, connections: 400, reactions: 3000, comments: 200, reposts: 100 },
  { name: '17 Nov', followers: 800, connections: 450, reactions: 3200, comments: 220, reposts: 110 },
  { name: '18 Nov', followers: 750, connections: 480, reactions: 3100, comments: 210, reposts: 105 },
  { name: '19 Nov', followers: 950, connections: 520, reactions: 4500, comments: 350, reposts: 150 },
  { name: '20 Nov', followers: 1100, connections: 600, reactions: 5200, comments: 400, reposts: 180 },
  { name: '21 Nov', followers: 1200, connections: 700, reactions: 4842, comments: 393, reposts: 195 },
];

export default function Analytics() {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [profileUrl, setProfileUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const { data: user } = useQuery<SessionUser>({ queryKey: ["/api/user"] });

  const handleNext = () => {
    if (step === 1) setStep(2);
    else {
      setIsConnected(true);
      setIsConnectModalOpen(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50/30 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics</h1>
            <p className="text-slate-500 mt-1">Get insights on reach, engagement, and more.</p>
          </div>
          <Button 
            className="bg-[#00a0dc] hover:bg-[#008dbf] text-white rounded-full px-6 font-bold flex items-center gap-2 h-11"
            onClick={() => {
              setStep(1);
              setIsConnectModalOpen(true);
            }}
          >
            <Plus className="w-5 h-5" />
            Setup Analytics
          </Button>
        </header>

        {!isConnected ? (
          <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex items-start gap-3 text-orange-800">
            <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">
              You are seeing demo data. Connect your LinkedIn profile to unlock your analytics and start tracking your profile's performance
            </p>
          </div>
        ) : (
          <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex items-start gap-3 text-orange-800 italic">
            <span className="text-orange-500">✨</span>
            <p className="text-sm font-medium leading-relaxed">
              We're currently collecting your data. Check back in a few days to see your detailed metrics.
            </p>
          </div>
        )}

        {/* Profile Stats Card */}
        <Card className="border-slate-200 overflow-hidden shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4 min-w-[300px]">
                <Avatar className="h-16 w-16 border-2 border-slate-100">
                  <AvatarImage src={isConnected ? "https://github.com/shadcn.png" : "https://i.pravatar.cc/150?u=rahul"} />
                  <AvatarFallback className="bg-blue-50 text-[#00a0dc] font-bold">RS</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{isConnected ? "Abdul Moiz" : "Rahul Sharma"}</h2>
                  <p className="text-sm text-slate-500 truncate max-w-[400px]">
                    {isConnected ? "Aspiring Cloud Engineer | AWS | Terraform | Cl..." : "Digital Marketing Strategist | Growth Hacker | H..."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#00a0dc]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Number of Followers</p>
                    <p className="text-xl font-bold text-slate-900">{isConnected ? "790" : "12,340"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#00a0dc]">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Connections</p>
                    <p className="text-xl font-bold text-slate-900">{isConnected ? "757" : "8,760"}</p>
                  </div>
                </div>

                <Button variant="outline" className="rounded-full gap-2 font-bold border-slate-200 text-slate-600 h-11 px-6">
                  <Globe className="w-4 h-4" />
                  View LinkedIn Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h3 className="text-sm font-bold text-slate-500">Followers Growth</h3>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-slate-900">225</span>
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mb-1 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                  <ArrowUpRight className="w-3 h-3" />
                  4.60%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-slate-500">Connections Growth</h3>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-slate-900">83</span>
                <div className="flex items-center gap-1 text-rose-500 text-xs font-bold mb-1 px-2 py-0.5 bg-rose-50 rounded-full border border-rose-100">
                  <ArrowDownRight className="w-3 h-3" />
                  -1.20%
                </div>
              </div>
            </CardContent>
          </Card>

          {!isConnected && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <h3 className="text-sm font-bold text-slate-500">Engagement Rate</h3>
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-bold text-slate-900">5.2%</span>
                  <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mb-1 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                    <ArrowUpRight className="w-3 h-3" />
                    2.1%
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts Section */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <CardTitle className="text-lg font-bold">Growth Overview</CardTitle>
              <CardDescription>Daily performance metrics</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full font-bold h-9 border-slate-200 text-slate-500 gap-2">
                All Posts
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demoChartData}>
                  <defs>
                    <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00a0dc" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#00a0dc" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorConnections" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="followers" 
                    stroke="#00a0dc" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorFollowers)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="connections" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorConnections)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Setup Modal */}
        <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-8 rounded-3xl border-none shadow-2xl overflow-hidden">
            <DialogHeader className="mb-6 flex flex-row items-center justify-between">
              <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">Connect LinkedIn Profile</DialogTitle>
              <DialogClose className="rounded-full h-8 w-8 flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </DialogClose>
            </DialogHeader>

            {step === 1 ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-tight">Your LinkedIn Profile URL</label>
                  <Input 
                    placeholder="https://" 
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#00a0dc]/20 transition-all text-base"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button 
                    variant="ghost" 
                    className="rounded-full h-11 px-6 font-bold text-slate-500"
                    onClick={() => setIsConnectModalOpen(false)}
                  >
                    Discard
                  </Button>
                  <Button 
                    className="rounded-full h-11 px-8 bg-[#00a0dc] hover:bg-[#008dbf] text-white font-bold"
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">Confirm your LinkedIn Profile</p>
                <div className="bg-slate-50 rounded-2xl p-6 flex items-center gap-4 border border-slate-100 shadow-sm">
                  <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback className="bg-blue-50 text-[#00a0dc]">AM</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-lg">Abdul Moiz</h4>
                    <p className="text-sm text-slate-500 truncate leading-relaxed">
                      Aspiring Cloud Engineer | AWS | Terraform | Cloud Automation Enthusiast | CS Graduate
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <Button 
                    variant="outline" 
                    className="rounded-full h-11 px-6 font-bold border-slate-200 text-slate-600"
                    onClick={() => setStep(1)}
                  >
                    Change Profile URL
                  </Button>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      className="rounded-full h-11 px-6 font-bold text-slate-500"
                      onClick={() => setIsConnectModalOpen(false)}
                    >
                      Discard
                    </Button>
                    <Button 
                      className="rounded-full h-11 px-8 bg-[#00a0dc] hover:bg-[#008dbf] text-white font-bold"
                      onClick={handleNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
