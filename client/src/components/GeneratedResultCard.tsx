import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function GeneratedResultCard({ isLoading, result, title = "Generated Post" }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "The generated content has been copied.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <Card className="mt-8 border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-slate-500 font-medium">Generating post...</p>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  return (
    <Card className="mt-8 border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 py-3 px-6">
        <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 text-slate-500 hover:text-slate-900">
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent className="p-6 whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">
        {result}
      </CardContent>
    </Card>
  );
}
