// @epic-3.5-communication: Admin CMS for help content management

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Filter,
  Video,
  Upload,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import UniversalHeader from "@/components/dashboard/universal-header";
import { useRBACAuth } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGetArticles } from "@/hooks/queries/help/use-get-articles";
import { useGetFAQs } from "@/hooks/queries/help/use-get-faqs";
import { useDeleteArticle } from "@/hooks/mutations/help/use-delete-article";
import { useDeleteFAQ } from "@/hooks/mutations/help/use-delete-faq";
import { ArticleModal } from "@/components/help/article-modal";
import { FAQModal } from "@/components/help/faq-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/dashboard/help/admin")({
  component: HelpAdminPage,
});

const categoryColors = {
  "getting-started": "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  "features": "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  "integrations": "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
  "troubleshooting": "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  "best-practices": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
};

function HelpAdminPage() {
  const navigate = useNavigate();
  const { hasPermission, user } = useRBACAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"articles" | "faqs" | "videos">("articles");

  const { data: articlesData, isLoading: articlesLoading } = useGetArticles({});
  const { data: faqsData, isLoading: faqsLoading } = useGetFAQs({});
  const deleteArticleMutation = useDeleteArticle();
  const deleteFAQMutation = useDeleteFAQ();

  const articles = articlesData?.data || [];
  const faqs = faqsData?.data || [];

  // Modal states
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [faqModalOpen, setFAQModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [editingFAQ, setEditingFAQ] = useState<any>(null);

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'article' | 'faq'; title: string } | null>(null);

  const handleCreateArticle = () => {
    setEditingArticle(null);
    setArticleModalOpen(true);
  };

  const handleEditArticle = (article: any) => {
    setEditingArticle(article);
    setArticleModalOpen(true);
  };

  const handleDeleteArticle = (article: any) => {
    setItemToDelete({ id: article.id, type: 'article', title: article.title });
    setDeleteDialogOpen(true);
  };

  const handleCreateFAQ = () => {
    setEditingFAQ(null);
    setFAQModalOpen(true);
  };

  const handleEditFAQ = (faq: any) => {
    setEditingFAQ(faq);
    setFAQModalOpen(true);
  };

  const handleDeleteFAQ = (faq: any) => {
    setItemToDelete({ id: faq.id, type: 'faq', title: faq.question });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'article') {
      await deleteArticleMutation.mutateAsync(itemToDelete.id);
    } else {
      await deleteFAQMutation.mutateAsync(itemToDelete.id);
    }

    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Check if user is authenticated and has admin privileges
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin' || user?.role === 'workspace-manager';

  if (!isAuthenticated) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Authentication Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please log in to access the admin panel.
              </p>
            </CardContent>
          </Card>
        </div>
      </LazyDashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Card className="max-w-md border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                You do not have permission to access the Help Center admin panel. 
                Only administrators and workspace managers can manage help content.
              </p>
              <p className="text-sm text-muted-foreground">
                Current role: <span className="font-medium text-foreground">{user?.role || 'member'}</span>
              </p>
              <Button 
                variant="outline" 
                className="mt-4 w-full"
                onClick={() => window.history.back()}
              >
                Go Back
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
        title="Help Content Management"
        subtitle="Create and manage help articles, FAQs, and tutorials"
        variant="default"
        customActions={
          <div className="flex gap-2">
            <Button onClick={handleCreateArticle}>
              <Plus className="h-4 w-4 mr-2" />
              Create Article
            </Button>
            <Button variant="outline" onClick={handleCreateFAQ}>
              <Plus className="h-4 w-4 mr-2" />
              Create FAQ
            </Button>
          </div>
        }
      />

      <div className="container mx-auto p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Articles</CardDescription>
              <CardTitle className="text-3xl">{articles.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total FAQs</CardDescription>
              <CardTitle className="text-3xl">{faqs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Views</CardDescription>
              <CardTitle className="text-3xl">
                {articles.reduce((sum, a) => sum + a.views, 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg Rating</CardDescription>
              <CardTitle className="text-3xl">
                {(articles.reduce((sum, a) => sum + a.rating, 0) / articles.length || 0).toFixed(1)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content Management Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList>
            <TabsTrigger value="articles">
              Articles ({articles.length})
            </TabsTrigger>
            <TabsTrigger value="faqs">
              FAQs ({faqs.length})
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Video className="h-4 w-4 mr-2" />
              Videos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-4 mt-6">
            {articlesLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading articles...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((article) => (
                  <Card key={article.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{article.title}</h3>
                            <Badge className={categoryColors[article.category as keyof typeof categoryColors]}>
                              {article.category}
                            </Badge>
                            <Badge variant="outline">{article.difficulty}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {article.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{article.views} views</span>
                            <span>⭐ {article.rating.toFixed(1)}</span>
                            <span>{article.readTime} min read</span>
                            <span>Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate({ to: `/dashboard/help/${article.slug}` })}
                            title="View article"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditArticle(article)}
                            title="Edit article"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteArticle(article)}
                            title="Delete article"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="faqs" className="space-y-4 mt-6">
            {faqsLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading FAQs...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <Card key={faq.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {faq.answer}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <Badge variant="secondary">{faq.category}</Badge>
                            <span>👍 {faq.helpful} helpful</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditFAQ(faq)}
                            title="Edit FAQ"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteFAQ(faq)}
                            title="Delete FAQ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="videos" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Video Tutorial Management</CardTitle>
                <CardDescription>
                  Upload and manage video tutorials for your help center
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Upload Video Tutorial</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop your video files here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supported formats: MP4, WebM, MOV (max 500MB)
                  </p>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Video Embedding</h4>
                  <p className="text-sm text-muted-foreground">
                    You can also embed videos from YouTube, Vimeo, or Loom by creating an article with contentType="video" and adding the embed URL in the metadata field.
                  </p>

                  <div className="bg-muted p-4 rounded-lg">
                    <h5 className="text-sm font-semibold mb-2">Example Metadata:</h5>
                    <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`{
  "videoUrl": "https://www.youtube.com/embed/...",
  "duration": "5:30",
  "thumbnail": "https://..."
}`}
                    </pre>
                  </div>

                  <Button variant="outline" onClick={handleCreateArticle}>
                    <Video className="h-4 w-4 mr-2" />
                    Create Video Article
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Existing Video Tutorials</h4>
                  <div className="space-y-2">
                    {articles.filter(a => a.contentType === 'video').length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No video tutorials yet. Create your first one!
                      </p>
                    ) : (
                      articles
                        .filter(a => a.contentType === 'video')
                        .map((video) => (
                          <Card key={video.id}>
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Video className="h-8 w-8 text-primary" />
                                  <div>
                                    <h5 className="font-semibold">{video.title}</h5>
                                    <p className="text-sm text-muted-foreground">
                                      {video.views} views · {video.readTime} min
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate({ to: `/dashboard/help/${video.slug}` })}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditArticle(video)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600"
                                    onClick={() => handleDeleteArticle(video)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <ArticleModal
        open={articleModalOpen}
        onOpenChange={setArticleModalOpen}
        article={editingArticle}
      />

      <FAQModal
        open={faqModalOpen}
        onOpenChange={setFAQModalOpen}
        faq={editingFAQ}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{itemToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LazyDashboardLayout>
  );
}

export default HelpAdminPage;
