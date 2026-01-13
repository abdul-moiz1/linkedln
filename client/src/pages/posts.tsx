import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PenLine, 
  Mic, 
  FileText, 
  Youtube, 
  Globe, 
  AlignLeft,
  ArrowLeft
} from "lucide-react";

interface TemplateCardProps {
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  onClick: () => void;
}

function TemplateCard({ title, description, icon: Icon, iconColor, onClick }: TemplateCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all border-slate-200/60 shadow-sm group active:scale-[0.98]"
      onClick={onClick}
    >
      <CardContent className="p-6 flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-slate-50 group-hover:bg-white transition-colors`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PostsPage() {
  const [, setLocation] = useLocation();

  const mainTemplates = [
    {
      title: "Generate Post from Scratch",
      description: "Use the power of AI-generated content to create impactful LinkedIn posts.",
      icon: PenLine,
      iconColor: "text-slate-700",
      url: "/posts/scratch"
    },
    {
      title: "Generate post from audio",
      description: "Record your thoughts and generate post from it.",
      icon: Mic,
      iconColor: "text-orange-500",
      url: "/posts/audio"
    }
  ];

  const repurposeTemplates = [
    {
      title: "Generate a post from a PDF",
      description: "Upload a PDF and generate a post from it",
      icon: FileText,
      iconColor: "text-purple-600",
      url: "/posts/pdf"
    },
    {
      title: "Generate a post from a Youtube video",
      description: "Share a Youtube video link and generate a post from it",
      icon: Youtube,
      iconColor: "text-red-500",
      url: "/posts/youtube"
    },
    {
      title: "Generate a post from an article",
      description: "Share a link to a blog post and generate a post from it",
      icon: Globe,
      iconColor: "text-emerald-500",
      url: "/posts/article"
    },
    {
      title: "Format your content",
      description: "Use the power of AI to format your clunky content into readable posts",
      icon: AlignLeft,
      iconColor: "text-blue-500",
      url: "/posts/format"
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation("/dashboard")}
          className="rounded-full h-10 w-10 hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Generate posts with AI</h1>
          <p className="text-slate-500">Select a template to generate high-quality posts with AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mainTemplates.map((template) => (
          <TemplateCard 
            key={template.title}
            {...template}
            onClick={() => setLocation(template.url)}
          />
        ))}
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Repurpose Content</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {repurposeTemplates.map((template) => (
            <TemplateCard 
              key={template.title}
              {...template}
              onClick={() => setLocation(template.url)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
