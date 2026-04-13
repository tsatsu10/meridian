import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function EnhancedSearch({
  value,
  onChange,
  placeholder = "Search projects... (try: status:active, priority:high)",
  className,
  inputRef,
}: EnhancedSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || localRef;

  // Parse search query for special filters
  const parsedQuery = parseSearchQuery(value);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="pl-10 pr-10"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Show active filters as badges */}
      {parsedQuery.filters.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {parsedQuery.filters.map((filter, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {filter.key}: {filter.value}
              <button
                onClick={() => {
                  const newQuery = value.replace(`${filter.key}:${filter.value}`, "").trim();
                  onChange(newQuery);
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search suggestions */}
      {isFocused && value.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-popover border rounded-md shadow-lg p-3 z-50">
          <p className="text-sm font-medium mb-2">Quick filters:</p>
          <div className="space-y-1">
            {[
              { label: "Active projects", query: "status:active" },
              { label: "High priority", query: "priority:high" },
              { label: "Overdue", query: "overdue" },
              { label: "Completed", query: "status:completed" },
            ].map((suggestion) => (
              <button
                key={suggestion.query}
                onClick={() => onChange(suggestion.query)}
                className="block w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
              >
                {suggestion.label}
                <span className="text-muted-foreground ml-2">{suggestion.query}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ParsedQuery {
  text: string;
  filters: Array<{ key: string; value: string }>;
}

function parseSearchQuery(query: string): ParsedQuery {
  const filters: Array<{ key: string; value: string }> = [];
  let text = query;

  // Match patterns like "status:active" or "priority:high"
  const filterPattern = /(\w+):(\w+)/g;
  const matches = [...query.matchAll(filterPattern)];

  matches.forEach((match) => {
    filters.push({ key: match[1], value: match[2] });
    text = text.replace(match[0], "").trim();
  });

  return { text, filters };
}

export function applySearchFilters(projects: any[], searchQuery: string) {
  if (!searchQuery) return projects;

  const parsed = parseSearchQuery(searchQuery);
  let filtered = [...projects];

  // Apply special filters
  parsed.filters.forEach((filter) => {
    if (filter.key === "status") {
      filtered = filtered.filter((p) => p.status?.toLowerCase() === filter.value.toLowerCase());
    } else if (filter.key === "priority") {
      filtered = filtered.filter((p) => p.priority?.toLowerCase() === filter.value.toLowerCase());
    }
  });

  // Apply text search
  if (parsed.text) {
    const searchText = parsed.text.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name?.toLowerCase().includes(searchText) ||
        p.description?.toLowerCase().includes(searchText)
    );
  }

  // Handle special keywords
  if (searchQuery.includes("overdue")) {
    const now = new Date();
    filtered = filtered.filter((p) => {
      if (!p.dueDate) return false;
      return new Date(p.dueDate) < now && p.status !== "completed";
    });
  }

  return filtered;
}

