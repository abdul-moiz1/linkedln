import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LanguageSelector, ContentStyleSelector } from "@/components/ContentStyleSelector";
import { GeneratedResultCard } from "@/components/GeneratedResultCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Sparkles, FileText } from "lucide-react";

export default function PdfPostGenerator() {
  const [file, setFile] = useState(null);
  const [instructions, setInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    }
  };

  const handleGenerate = () => {
    if (!file) return;
    setIsLoading(true);
    setResult(null);

    setTimeout(() => {
      setIsLoading(false);
      setResult(`🚀 How we scaled our operations using PDF automation

I've been thinking a lot about structural efficiency lately. Most companies treat PDFs as "dead documents," but they are actually untapped data goldmines.

Here's my 3-step framework for PDF data extraction:

1️⃣ The Identifier (The Sorter)
Every document needs clear classification. You can't process what you haven't identified.

2️⃣ Automated Flow (The Pipeline)
Once identified, data should flow directly into your CRM. No manual entry. No human error.

3️⃣ Validation Layer (The Quality Check)
Final verification ensures data integrity remains at 100%.

The uncomfortable question: How much time is your team losing to "copy-paste" tasks?

It's not a documentation problem. It's an architectural one.

Innovation is flashy. Strategy is sustainable. Choose wisely.`);
    }, 1200);
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
            />
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 bg-blue-50 rounded-full text-blue-500 group-hover:scale-110 transition-transform">
                {file ? <FileText className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
              </div>
              <div>
                <p className="text-slate-900 font-medium">
                  {file ? file.name : "Choose a file or drag & drop it here."}
                </p>
                <p className="text-slate-400 text-sm mt-1">Accept only .pdf</p>
              </div>
              <Button variant="outline" className="text-blue-600 border-blue-200">
                Browse File
              </Button>
            </div>
          </div>
        </div>

        <ContentStyleSelector />

        <div className="space-y-4">
          <Label className="text-sm font-medium text-slate-700">Add your instructions</Label>
          <Textarea 
            placeholder="focus on a specific part of the PDF"
            className="min-h-[120px] border-gray-200 rounded-xl focus:ring-blue-500"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        <Button 
          className="w-full md:w-auto px-8 py-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
          onClick={handleGenerate}
          disabled={!file || isLoading}
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Generate
        </Button>

        <GeneratedResultCard isLoading={isLoading} result={result} />
      </div>
    </div>
  );
}
