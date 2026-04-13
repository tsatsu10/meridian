// @epic-3.5-communication: Article detail page with full content rendering

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ArrowLeft,
  Clock,
  Star,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Share,
  Eye,
  Calendar,
  Tag,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";
import { useGetArticle } from "@/hooks/queries/help/use-get-article";
import { useRateArticle, useArticleFeedback } from "@/hooks/mutations/help/use-rate-article";
import { MarkdownRenderer } from "@/components/help/markdown-renderer";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import UniversalHeader from "@/components/dashboard/universal-header";

export const Route = createFileRoute("/dashboard/help/$slug")({
  component: ArticleDetailPage,
});

const categoryColors = {
  "getting-started": "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  "features": "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  "integrations": "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
  "troubleshooting": "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  "best-practices": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
};

const difficultyColors = {
  "beginner": "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  "intermediate": "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300",
  "advanced": "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
};

function ArticleDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetArticle(slug);
  const rateArticleMutation = useRateArticle();
  const feedbackMutation = useArticleFeedback();

  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const article = data?.data || data;

  const handleRating = (rating: number) => {
    if (!article) return;
    setSelectedRating(rating);
    rateArticleMutation.mutate({ articleId: article.id, rating });
  };

  const handleFeedback = (helpful: boolean) => {
    if (!article) return;
    feedbackMutation.mutate({ articleId: article.id, helpful });
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast.success(isBookmarked ? "Removed from bookmarks" : "Added to bookmarks");
  };

  const handleShare = () => {
    if (!article) return;
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  if (isLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading article...</p>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  if (error || !article) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <h2 className="text-xl font-semibold text-red-600">Article Not Found</h2>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The article you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate({ to: "/dashboard/help" })}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Help Center
              </Button>
            </CardContent>
          </Card>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <UniversalHeader
        title={article.title}
        subtitle="Help & Documentation"
        variant="default"
        customActions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/help">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Help
            </Link>
          </Button>
        }
      />

      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        {/* Article Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="glass-card border-border/50">
            <CardHeader className="space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge className={cn("text-xs", categoryColors[article.category as keyof typeof categoryColors])}>
                  {article.category.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </Badge>
                <Badge variant="outline" className={cn("text-xs", difficultyColors[article.difficulty as keyof typeof difficultyColors])}>
                  {article.difficulty}
                </Badge>
                {article.tags && Array.isArray(article.tags) && article.tags.slice(0, 3).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold gradient-text">{article.title}</h1>

              {/* Description */}
              <p className="text-xl text-muted-foreground">{article.description}</p>

              {/* Meta Information */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{article.readTime} min read</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{article.views} views</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{article.rating.toFixed(1)}</span>
                  {article.ratingCount > 0 && (
                    <span className="text-xs">({article.ratingCount})</span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                <Button
                  variant={isBookmarked ? "default" : "outline"}
                  size="sm"
                  onClick={handleBookmark}
                  className="glass-card"
                >
                  <Bookmark className={cn("h-4 w-4 mr-2", isBookmarked && "fill-current")} />
                  {isBookmarked ? "Bookmarked" : "Bookmark"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare} className="glass-card">
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Article Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass-card border-border/50">
            <CardContent className="p-8">
              <MarkdownRenderer content={article.content} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Rating Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="glass-card border-border/50">
            <CardHeader>
              <h3 className="text-lg font-semibold">Was this article helpful?</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Star Rating */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Rate this article:</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRating(rating)}
                      className="transition-transform hover:scale-110"
                      disabled={rateArticleMutation.isPending}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          rating <= (selectedRating || article.rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Helpful Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback(true)}
                  disabled={feedbackMutation.isPending}
                  className="glass-card"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Helpful ({article.helpful})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback(false)}
                  disabled={feedbackMutation.isPending}
                  className="glass-card"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Not Helpful
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Related Articles (Placeholder) */}
        {article.tags && Array.isArray(article.tags) && article.tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="glass-card border-border/50">
              <CardHeader>
                <h3 className="text-lg font-semibold">Related Topics</h3>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag: string) => (
                    <Link
                      key={tag}
                      to="/dashboard/help"
                      search={{ q: tag }}
                    >
                      <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </LazyDashboardLayout>
  );
}

export default ArticleDetailPage;
