import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";

export function PageHeader({ title, subtitle, showBack = true }) {
  const [, setLocation] = useLocation();

  return (
    <div className="w-full space-y-4 pt-6 pb-2">
      <div className="flex items-start gap-4">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 h-8 w-8 rounded-full border border-gray-200"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight" data-testid="text-page-title">
            {title}
          </h1>
          <p className="text-slate-500 text-sm" data-testid="text-page-subtitle">
            {subtitle}
          </p>
        </div>
      </div>
      <Separator className="bg-gray-200" />
    </div>
  );
}
