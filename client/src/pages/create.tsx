import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  FileText, 
  Youtube, 
  Globe, 
  AlignLeft,
  ArrowRight
} from "lucide-react";

const generatorOptions = [
  {
    title: "PDF to Post",
    description: "Upload a PDF and generate a high-quality post from its content.",
    icon: FileText,
    href: "/generate-posts/pdf",
    color: "text-blue-500",
    bg: "bg-blue-50"
  },
  {
    title: "YouTube to Post",
    description: "Share a video link and turn it into a compelling LinkedIn story.",
    icon: Youtube,
    href: "/generate-posts/youtube",
    color: "text-red-500",
    bg: "bg-red-50"
  },
  {
    title: "Article to Post",
    description: "Transform any blog post or article into social media content.",
    icon: Globe,
    href: "/generate-posts/article",
    color: "text-emerald-500",
    bg: "bg-emerald-50"
  },
  {
    title: "Format Content",
    description: "Clean up and structure your clunky thoughts into readable posts.",
    icon: AlignLeft,
    href: "/generate-posts/format",
    color: "text-purple-500",
    bg: "bg-purple-50"
  }
];

export default function Create() {
  const [, setLocation] = useLocation();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create New Post</h1>
        <p className="text-slate-500 mt-2">Choose a source to start generating your LinkedIn content with AI.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {generatorOptions.map((option) => (
          <Card 
            key={option.title}
            className="group hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer border-gray-200 overflow-hidden"
            onClick={() => setLocation(option.href)}
          >
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className={`p-3 rounded-xl ${option.bg} ${option.color} group-hover:scale-110 transition-transform`}>
                <option.icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-semibold text-slate-900">{option.title}</CardTitle>
                <CardDescription className="text-slate-500 text-sm leading-relaxed">
                  {option.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
