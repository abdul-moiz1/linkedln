import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LanguageSelector, ContentStyleSelector } from "@/components/ContentStyleSelector";
import { GeneratedResultCard } from "@/components/GeneratedResultCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

export default function ArticlePostGenerator() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const validateUrl = (value: string) => {
    if (!value) return true;
    const isHttp = value.startsWith("http://") || value.startsWith("https://");
    const isRestricted = value.includes(".pdf") || value.includes("docs.google.com");
    
    if (!isHttp) {
      setError("URL must start with http:// or https://");
      return false;
    } else if (isRestricted) {
      setError("Currently, we don't support PDFs or Google Docs.");
      return false;
    } else {
      setError("");
      return true;
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    if (value) validateUrl(value);
  };

  const handleGenerate = async () => {
    if (!url || error) return;
    setIsLoading(true);
    setResult(null);
    setError("");

    try {
      const response = await fetch("/api/repurpose/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleUrl: url, instructions }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate post");
      }

      setResult(data.post);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pb-20">
      <PageHeader 
        title="Generate a post from an article" 
        subtitle="Share a link to a blog post and generate a post from it" 
      />
      
      <div className="mt-8 space-y-6">
        <LanguageSelector />

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-slate-700">Blog post URL</Label>
            <p className="text-xs text-slate-400 font-normal italic">
              (the URL content should be open and public), Currently, we don't support PDFs, Google Docs.
            </p>
          </div>
          <Input 
            placeholder="https://www.example.com/blog-post"
            className={`border-gray-200 rounded-xl h-12 focus:ring-blue-500 ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
            value={url}
            onChange={handleUrlChange}
            data-testid="input-article-url"
          />
          {error && <p className="text-red-500 text-xs mt-1 font-medium" data-testid="text-error">{error}</p>}
        </div>

        <ContentStyleSelector />

        <div className="space-y-4">
          <Label className="text-sm font-medium text-slate-700">Add your instructions</Label>
          <Textarea 
            placeholder="add less emojis"
            className="min-h-[120px] border-gray-200 rounded-xl focus:ring-blue-500"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            data-testid="input-instructions"
          />
        </div>

        <Button 
          className="w-full md:w-auto px-8 py-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
          onClick={handleGenerate}
          disabled={!url || !!error || isLoading}
          data-testid="button-generate"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          {isLoading ? "Generating..." : "Generate"}
        </Button>

        <GeneratedResultCard isLoading={isLoading} result={result} />
      </div>
    </div>
  );
}
