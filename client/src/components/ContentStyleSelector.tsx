import { Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function LanguageSelector() {
  return (
    <div className="flex items-center gap-2 mb-6 text-slate-600 text-sm">
      <Globe className="h-4 w-4" />
      <span>English</span>
    </div>
  );
}

export function ContentStyleSelector() {
  const [selected, setSelected] = useState("format");

  return (
    <div className="space-y-4 my-8">
      <h3 className="text-lg font-medium text-slate-900">Select Post format or Content style</h3>
      <RadioGroup value={selected} onValueChange={setSelected} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`relative flex items-start gap-3 p-4 rounded-xl border transition-all ${selected === "format" ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
          <RadioGroupItem value="format" id="format" className="mt-1" />
          <Label htmlFor="format" className="flex-1 cursor-pointer">
            <span className="block font-semibold text-slate-900">Post Formats</span>
            <span className="block text-sm text-slate-500 mt-1">Generate your content in different formats that to get you more reach.</span>
            <Button variant="outline" size="sm" className="mt-3 text-blue-600 border-blue-200 hover:bg-blue-50">
              + Select a post format
            </Button>
          </Label>
        </div>

        <div className={`relative flex items-start gap-3 p-4 rounded-xl border transition-all ${selected === "style" ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
          <RadioGroupItem value="style" id="style" className="mt-1" />
          <Label htmlFor="style" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="block font-semibold text-slate-900">Content Style</span>
              <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Beta</span>
            </div>
            <span className="block text-sm text-slate-500 mt-1">Generate your content that can mimic your writing style and personalized tone.</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
