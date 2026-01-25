import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LanguageSelector, ContentStyleSelector } from "@/components/ContentStyleSelector";
import { GeneratedResultCard } from "@/components/GeneratedResultCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

export default function YoutubePostGenerator() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const validateUrl = (value: string) => {
    if (!value) return true;
    const isValid = value.includes("youtube.com/watch?v=") || value.includes("youtu.be/");
    if (!isValid) {
      setError("Please enter a valid YouTube URL (youtube.com/watch?v= or youtu.be/)");
    } else {
      setError("");
    }
    return isValid;
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
      const response = await fetch("/api/repurpose/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: url, instructions }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.message || data.error || "Failed to generate post";
        throw new Error(errorMsg);
      }

      setResult(data.post);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      // You could add a toast here if available, but the prompt just says add Copy button
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pb-20">
      <PageHeader 
        title="Generate a post from a Youtube video" 
        subtitle="Share a Youtube video link and generate a post from it" 
      />
      
      <div className="mt-8 space-y-6">
        <LanguageSelector />

        <div className="space-y-4">
          <Label className="text-sm font-medium text-slate-700">Youtube Video URL</Label>
          <Input 
            placeholder="https://www.youtube.com/watch?v=xxxx"
            className={`border-gray-200 rounded-xl h-12 focus:ring-blue-500 ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
            value={url}
            onChange={handleUrlChange}
            data-testid="input-youtube-url"
          />
          {error && <p className="text-red-500 text-xs mt-1 font-medium" data-testid="text-error">{error}</p>}
        </div>

        <ContentStyleSelector />

        <div className="space-y-4">
          <Label className="text-sm font-medium text-slate-700">Add your instructions</Label>
          <Textarea 
            placeholder="focus on a specific part of the video"
            className="min-h-[120px] border-gray-200 rounded-xl focus:ring-blue-500"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            data-testid="input-instructions"
          />
        </div>

        <div className="flex gap-4">
          <Button 
            className="flex-1 md:w-auto px-8 py-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
            onClick={handleGenerate}
            disabled={!url || !!error || isLoading}
            data-testid="button-generate"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {isLoading ? "Generating..." : "Generate"}
          </Button>

          {result && (
            <Button
              variant="outline"
              className="px-8 py-6 rounded-full font-semibold text-lg border-gray-200 hover:bg-gray-50 transition-all"
              onClick={copyToClipboard}
              data-testid="button-copy"
            >
              Copy Post
            </Button>
          )}
        </div>

        <GeneratedResultCard isLoading={isLoading} result={result} />
      </div>
    </div>
  );
}
