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
  const [result, setResult] = useState(null);

  const validateUrl = (value) => {
    if (!value) return true;
    const isValid = value.includes("youtube.com/watch?v=") || value.includes("youtu.be/");
    if (!isValid) {
      setError("Please enter a valid YouTube URL (youtube.com/watch?v= or youtu.be/)");
    } else {
      setError("");
    }
    return isValid;
  };

  const handleUrlChange = (e) => {
    const value = e.target.value;
    setUrl(value);
    if (value) validateUrl(value);
  };

  const handleGenerate = () => {
    if (!url || error) return;
    setIsLoading(true);
    setResult(null);

    setTimeout(() => {
      setIsLoading(false);
      setResult(`🎥 Key takeaways from this incredible YouTube video

I just finished watching a deep dive on video-first marketing, and it completely changed my perspective on how we build brands in 2026.

Here are my top 3 insights:

1️⃣ Attention is the New Currency
We used to compete for clicks. Now we compete for seconds. If you don't hook the viewer in 3 seconds, you've lost them.

2️⃣ Authenticity > Production
Raw, unedited, "behind-the-scenes" content is outperforming high-budget studio shoots 4-to-1.

3️⃣ The Hybrid Strategy
Long-form builds depth. Short-form builds reach. You need both to survive.

Now the uncomfortable question: Is your brand still hiding behind a logo, or are you showing your face?

The content landscape is shifting faster than ever. Are you adapting or just watching?`);
    }, 1200);
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
          />
          {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
        </div>

        <ContentStyleSelector />

        <div className="space-y-4">
          <Label className="text-sm font-medium text-slate-700">Add your instructions</Label>
          <Textarea 
            placeholder="focus on a specific part of the video"
            className="min-h-[120px] border-gray-200 rounded-xl focus:ring-blue-500"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        <Button 
          className="w-full md:w-auto px-8 py-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
          onClick={handleGenerate}
          disabled={!url || !!error || isLoading}
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Generate
        </Button>

        <GeneratedResultCard isLoading={isLoading} result={result} />
      </div>
    </div>
  );
}
