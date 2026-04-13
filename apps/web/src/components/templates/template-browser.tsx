import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Star, Clock, Users, Sparkles } from "lucide-react";
import { getTemplates } from "../../fetchers/templates/get-templates";
import type { TemplateFilterOptions, ProjectTemplate } from "../../types/templates";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { TemplateCard } from "./template-card";
import { TemplateDetailModal } from "./template-detail-modal";

export function TemplateBrowser() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [filters, setFilters] = useState<TemplateFilterOptions>({
    sortBy: 'popular',
    sortOrder: 'desc',
    limit: 50,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['templates', filters],
    queryFn: () => getTemplates(filters),
  });

  // Group templates by industry
  const templatesByIndustry = useMemo(() => {
    if (!data?.templates) return {};
    
    const grouped: Record<string, ProjectTemplate[]> = {};
    data.templates.forEach((template) => {
      if (!grouped[template.industry]) {
        grouped[template.industry] = [];
      }
      grouped[template.industry].push(template);
    });
    
    return grouped;
  }, [data?.templates]);

  const industries = Object.keys(templatesByIndustry).sort();

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: value, offset: 0 }));
  };

  const handleIndustryFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      industry: value === 'all' ? undefined : value,
      offset: 0,
    }));
  };

  const handleDifficultyFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      difficulty: value === 'all' ? undefined : (value as any),
      offset: 0,
    }));
  };

  const handleSortChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: value as any,
      offset: 0,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Templates</h1>
          <p className="text-muted-foreground mt-1">
            Choose from {data?.total || 0} professional templates across {industries.length} industries
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Official Templates
        </Badge>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-9"
              value={filters.searchQuery || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Industry Filter */}
          <Select
            value={filters.industry || 'all'}
            onValueChange={handleIndustryFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry} ({templatesByIndustry[industry].length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Difficulty Filter */}
          <Select
            value={filters.difficulty || 'all'}
            onValueChange={handleDifficultyFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 mt-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={filters.sortBy || 'popular'} onValueChange={handleSortChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Templates Grid - Grouped by Industry */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6 mb-4" />
              <div className="flex gap-2 mb-4">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : filters.industry ? (
        // Single industry view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(templatesByIndustry[filters.industry] || []).map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onViewDetails={() => setSelectedTemplate(template.id)}
            />
          ))}
        </div>
      ) : (
        // Grouped by industry view
        <div className="space-y-8">
          {industries.map((industry) => (
            <div key={industry}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold">{industry}</h2>
                <Badge variant="outline">
                  {templatesByIndustry[industry].length} templates
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templatesByIndustry[industry].slice(0, 6).map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onViewDetails={() => setSelectedTemplate(template.id)}
                  />
                ))}
              </div>
              {templatesByIndustry[industry].length > 6 && (
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => handleIndustryFilter(industry)}
                >
                  View all {templatesByIndustry[industry].length} templates in {industry}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && data?.templates.length === 0 && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-2">
            <Search className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No templates found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or search query
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setFilters({ sortBy: 'popular', sortOrder: 'desc', limit: 50 })}
            >
              Clear Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          templateId={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}

