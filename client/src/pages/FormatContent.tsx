import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LanguageSelector } from "@/components/ContentStyleSelector";
import { GeneratedResultCard } from "@/components/GeneratedResultCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

export default function FormatContent() {
  const [content, setContent] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!content) return;
    setIsLoading(true);
    setResult(null);
    setError("");

    try {
      const response = await fetch("/api/repurpose/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawContent: content, instructions }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to format content");
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
        title="Format your content" 
        subtitle="Use the power of AI to format your clunky content into readable posts" 
      />
      
      <div className="mt-8 space-y-6">
        <LanguageSelector />

        <div className="space-y-4">
          <Label className="text-sm font-medium text-slate-700">Add your content</Label>
          <Textarea 
            placeholder="Paste your content"
            className="min-h-[250px] border-gray-200 rounded-xl focus:ring-blue-500 text-base"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            data-testid="input-content"
          />
        </div>

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

        {error && <p className="text-red-500 text-sm font-medium" data-testid="text-error">{error}</p>}

        <Button 
          className="w-full md:w-auto px-8 py-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
          onClick={handleGenerate}
          disabled={!content || isLoading}
          data-testid="button-generate"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          {isLoading ? "Generating..." : "Generate"}
        </Button>

        <GeneratedResultCard isLoading={isLoading} result={result} title="Formatted Output" />
      </div>
    </div>
  );
}
