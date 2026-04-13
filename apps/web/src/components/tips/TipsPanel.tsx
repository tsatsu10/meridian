import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Lightbulb,
  Search,
  BookmarkIcon,
  TrendingUp,
  Filter,
  X,
  Sparkles,
  Book,
  Star,
} from 'lucide-react';
import { useTips, useTipSearch, useBookmarkedTips } from '@/hooks/use-tips';
import { TipCard } from './TipCard';
import { cn } from '@/lib/cn';
import type { TipCategory, TipLevel } from '@/types/tips';

interface TipsPanelProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CATEGORY_LABELS: Record<TipCategory, string> = {
  navigation: 'Navigation',
  tasks: 'Tasks',
  communication: 'Communication',
  analytics: 'Analytics',
  automation: 'Automation',
  shortcuts: 'Shortcuts',
  collaboration: 'Collaboration',
  workflows: 'Workflows',
  reports: 'Reports',
  settings: 'Settings',
};

export function TipsPanel({ trigger, open, onOpenChange }: TipsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TipCategory | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<TipLevel | 'all'>('all');
  const [showBookmarked, setShowBookmarked] = useState(false);

  const {
    dismissTip,
    bookmarkTip,
    unbookmarkTip,
    recordTipAction,
    userProgress,
    getTipsByCategory,
    getTipsByLevel,
  } = useTips();

  const bookmarkedTips = useBookmarkedTips();
  const searchResults = useTipSearch(searchQuery);

  // Get filtered tips
  const filteredTips = useMemo(() => {
    let tips = showBookmarked ? bookmarkedTips : searchQuery ? searchResults : [];

    // If no search and not showing bookmarked, get all tips
    if (!searchQuery && !showBookmarked) {
      if (selectedCategory !== 'all') {
        tips = getTipsByCategory(selectedCategory);
      } else if (selectedLevel !== 'all') {
        tips = getTipsByLevel(selectedLevel);
      }
    }

    // Apply additional filters
    if (selectedCategory !== 'all' && !showBookmarked) {
      tips = tips.filter((tip) => tip.category === selectedCategory);
    }

    if (selectedLevel !== 'all') {
      tips = tips.filter((tip) => tip.level === selectedLevel);
    }

    return tips;
  }, [
    searchQuery,
    searchResults,
    showBookmarked,
    bookmarkedTips,
    selectedCategory,
    selectedLevel,
    getTipsByCategory,
    getTipsByLevel,
  ]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedLevel('all');
    setShowBookmarked(false);
  };

  const hasActiveFilters =
    searchQuery || selectedCategory !== 'all' || selectedLevel !== 'all' || showBookmarked;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Tips & Hints
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Tips & Hints Library</SheetTitle>
              <SheetDescription>
                Explore helpful tips to master Meridian
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Filters */}
        <div className="px-6 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2">
            {/* Category filter */}
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as TipCategory | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Level filter */}
            <Select
              value={selectedLevel}
              onValueChange={(value) => setSelectedLevel(value as TipLevel | 'all')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            {/* Bookmarked toggle */}
            <Button
              variant={showBookmarked ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowBookmarked(!showBookmarked)}
              className="gap-1"
            >
              <BookmarkIcon className="w-3 h-3" />
              Saved
            </Button>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Stats */}
        <div className="px-6 grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{userProgress.seenTips.length}</p>
            <p className="text-xs text-muted-foreground">Tips Seen</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{userProgress.bookmarkedTips.length}</p>
            <p className="text-xs text-muted-foreground">Bookmarked</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{userProgress.actionsFromTips}</p>
            <p className="text-xs text-muted-foreground">Actions</p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Tips List */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-6">
            {filteredTips.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-lg font-medium mb-2">No tips found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search or filters'
                    : 'Select a category or search for tips'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredTips.map((tip, index) => (
                  <motion.div
                    key={tip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <TipCard
                      tip={tip}
                      variant="default"
                      onDismiss={(permanent) => dismissTip(tip.id, permanent)}
                      onAction={(action) => recordTipAction(tip.id, action)}
                      onBookmark={() => {
                        if (userProgress.bookmarkedTips.includes(tip.id)) {
                          unbookmarkTip(tip.id);
                        } else {
                          bookmarkTip(tip.id);
                        }
                      }}
                      isBookmarked={userProgress.bookmarkedTips.includes(tip.id)}
                      showActions={true}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>💡 Press ? to view keyboard shortcuts</span>
            <span>{filteredTips.length} tips</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
