import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LanguageSelector, ContentStyleSelector } from "@/components/ContentStyleSelector";
import { GeneratedResultCard } from "@/components/GeneratedResultCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Sparkles, FileText } from "lucide-react";

export default function PdfPostGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError("");
    } else if (selectedFile) {
      setError("Please select a valid PDF file");
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      setError("Please upload a PDF file");
      return;
    }
    setIsLoading(true);
    setResult(null);
    setError("");

    try {
      const formData = new FormData();
      formData.append("pdfFile", file);
      formData.append("instructions", instructions);

      const response = await fetch("/api/repurpose/pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to generate post");
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
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pb-20">
      <PageHeader 
        title="Generate a post from a PDF" 
        subtitle="Upload a PDF and generate a post from it" 
      />
      
      <div className="mt-8 space-y-6">
        <LanguageSelector />

        <div className="space-y-4">
          <Label className="text-sm font-medium text-slate-700">Upload PDF</Label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center bg-white hover:bg-slate-50 transition-colors cursor-pointer relative group">
            <input 
              type="file" 
              accept=".pdf" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileChange}
              data-testid="input-pdf-file"
            />
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 bg-blue-50 rounded-full text-blue-500 group-hover:scale-110 transition-transform">
                {file ? <FileText className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
              </div>
              <div>
                <p className="text-slate-900 font-medium" data-testid="text-file-name">
                  {file ? file.name : "Choose a file or drag & drop it here."}
                </p>
                <p className="text-slate-400 text-sm mt-1">Accept only .pdf (max 10MB)</p>
              </div>
              <Button variant="outline" className="text-blue-600 border-blue-200">
                Browse File
              </Button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm font-medium" data-testid="text-error">{error}</p>}
        </div>

        <ContentStyleSelector />

        <div className="space-y-4">
          <Label className="text-sm font-medium text-slate-700">Add your instructions</Label>
          <Textarea 
            placeholder="focus on a specific part of the PDF"
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
            disabled={!file || isLoading}
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
