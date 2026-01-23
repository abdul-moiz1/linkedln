import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, FileText, Layers, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface SearchResult {
  id: string;
  title?: string;
  name?: string;
  templateName?: string;
  description?: string;
  category?: string;
  status?: string;
  score?: number;
  slides?: any[];
  createdAt?: any;
}

interface SemanticSearchProps {
  userId: string;
  onClose?: () => void;
  defaultCollection?: string;
}

export function SemanticSearch({ userId, onClose, defaultCollection }: SemanticSearchProps) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<string>(defaultCollection || "carousels");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (searchData: { collection: string; userId: string; query: string; topK: number }) => {
      const response = await apiRequest("POST", "/api/vector/search", searchData);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setResults(data.results || []);
      } else {
        setResults([]);
      }
      setHasSearched(true);
    },
    onError: (error) => {
      console.error("Search error:", error);
      setResults([]);
      setHasSearched(true);
    },
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    searchMutation.mutate({
      collection,
      userId,
      query: query.trim(),
      topK: 10,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (collection === "carousels") {
      navigate(`/my-carousels?highlight=${result.id}`);
    } else {
      navigate(`/templates?highlight=${result.id}`);
    }
    onClose?.();
  };

  const getResultTitle = (result: SearchResult) => {
    return result.title || result.name || result.templateName || "Untitled";
  };

  const getResultPreview = (result: SearchResult) => {
    if (result.description) {
      return result.description.substring(0, 100) + (result.description.length > 100 ? "..." : "");
    }
    if (result.slides && result.slides.length > 0) {
      const firstSlide = result.slides[0];
      const text = firstSlide.rawText || firstSlide.finalText || firstSlide.placeholder?.body || "";
      return text.substring(0, 100) + (text.length > 100 ? "..." : "");
    }
    return "No preview available";
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-background rounded-lg border shadow-lg w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Semantic Search</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-search">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={collection} onValueChange={setCollection}>
          <SelectTrigger className="w-[180px]" data-testid="select-collection">
            <SelectValue placeholder="Select collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="carousels">My Carousels</SelectItem>
            <SelectItem value="templates">Templates</SelectItem>
            <SelectItem value="carouselTemplates">Carousel Templates</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search by meaning... e.g., 'write a hook for linkedin'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          data-testid="input-search-query"
        />

        <Button
          onClick={handleSearch}
          disabled={searchMutation.isPending || !query.trim()}
          data-testid="button-search"
        >
          {searchMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      {searchMutation.isPending && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Searching...</span>
        </div>
      )}

      {hasSearched && !searchMutation.isPending && (
        <ScrollArea className="h-[300px]">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mb-2 opacity-50" />
              <p>No results found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {results.map((result) => (
                <Card
                  key={result.id}
                  className="cursor-pointer hover-elevate transition-all"
                  onClick={() => handleResultClick(result)}
                  data-testid={`card-result-${result.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
                          <h4 className="font-medium truncate">{getResultTitle(result)}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {getResultPreview(result)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {result.category && (
                          <Badge variant="secondary" className="text-xs">
                            {result.category}
                          </Badge>
                        )}
                        {result.score !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(result.score * 100)}% match
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      )}

      {!hasSearched && !searchMutation.isPending && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Search className="w-12 h-12 mb-2 opacity-50" />
          <p>Search your content by meaning</p>
          <p className="text-sm">Examples: "email marketing tips", "how to grow business"</p>
        </div>
      )}
    </div>
  );
}
