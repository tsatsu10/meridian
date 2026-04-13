/**
 * 👤 User Profile Page - REDESIGNED
 * 
 * Modern, beautiful full profile view with:
 * - Glassmorphism effects
 * - Animated statistics
 * - Gradient backgrounds
 * - Enhanced visual hierarchy
 * - Smooth animations
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { recordProfileView } from "@/fetchers/profile/smart-profile-fetchers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MessageCircle,
  Award,
  MapPin,
  Clock,
  Briefcase,
  Building2,
  Globe,
  Github,
  Linkedin,
  Twitter,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Users,
  Target,
  Trophy,
  Flame,
  Star,
  Sparkles,
  ChevronRight,
  Eye,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { format } from "date-fns";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { BlurFade } from "@/components/magicui/blur-fade";
import NumberTicker from "@/components/magicui/number-ticker";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { BorderBeam } from "@/components/magicui/border-beam";
import { GiveKudosModal } from "@/components/team/give-kudos-modal";

// Smart Profile Components
import { ProfileViewers } from "@/components/profile/analytics/ProfileViewers";
import { CompletenessScore } from "@/components/profile/analytics/CompletenessScore";
import { OptimizationSuggestions } from "@/components/profile/analytics/OptimizationSuggestions";
import { ProfileInsights } from "@/components/profile/analytics/ProfileInsights";
import { ActiveProjects } from "@/components/profile/work-activity/ActiveProjects";
import { RecentTasks } from "@/components/profile/work-activity/RecentTasks";
import { AvailabilityStatus } from "@/components/profile/work-activity/AvailabilityStatus";
import { FrequentCollaborators } from "@/components/profile/work-activity/FrequentCollaborators";
import { WorkloadIndicator } from "@/components/profile/work-activity/WorkloadIndicator";
import { ActivityFeed } from "@/components/profile/work-activity/ActivityFeed";
import { UserStatisticsCards } from "@/components/profile/statistics/UserStatisticsCards";
import { BadgeCollection } from "@/components/profile/badges/BadgeCollection";
import { EnhancedAchievements } from "@/components/profile/achievements/EnhancedAchievements";
import { TeamsEnhanced } from "@/components/profile/teams/TeamsEnhanced";
import { WorkHistoryTimeline } from "@/components/profile/work-history/WorkHistoryTimeline";

export const Route = createFileRoute("/dashboard/profile/$userId")({
  component: ProfilePage,
});

function ProfilePage() {
  return <ProfilePageRedesigned />;
}


function ProfilePageRedesigned() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'work' | 'analytics' | 'goals' | 'achievements' | 'activity'>('overview');
  const [showKudosModal, setShowKudosModal] = useState(false);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      const response = await api.get(`/api/profile/${userId}/public`);
      return response?.data || response;
    },
  });
  
  const profile = data?.data || data;
  const user = profile?.user;
  const isOwnProfile = profile?.isOwnProfile;
  
  // Record profile view automatically
  useEffect(() => {
    if (userId && !isOwnProfile) {
      const deviceType = /mobile/i.test(navigator.userAgent) 
        ? 'mobile' 
        : /tablet/i.test(navigator.userAgent)
        ? 'tablet'
        : 'desktop';
      
      recordProfileView(userId, {
        source: 'direct',
        deviceType,
      }).catch((err) => {
        console.error('Failed to record profile view:', err);
      });
    }
  }, [userId, isOwnProfile]);
  
  // Calculate profile completeness
  const profileFields = [
    user?.bio, user?.jobTitle, user?.company, user?.location, 
    user?.phone, user?.linkedinUrl, user?.githubUrl, user?.website
  ];
  const filledFields = profileFields.filter(Boolean).length;
  const profileCompleteness = Math.round((filledFields / profileFields.length) * 100);
  
  if (isLoading) {
    return (
      <LazyDashboardLayout>
        <div className="min-h-screen">
          {/* Animated loading state with gradient */}
          <div className="relative h-80 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 animate-pulse">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
          </div>
          <div className="max-w-7xl mx-auto px-6 -mt-32">
            <div className="flex flex-col items-center gap-6">
              <div className="h-48 w-48 rounded-full bg-muted/50" />
              <div className="h-12 w-64 rounded-lg bg-muted/50" />
              <div className="grid grid-cols-4 gap-4 w-full">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 rounded-xl bg-muted/50" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }
  
  if (error || !profile || !user) {
    return (
      <LazyDashboardLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="p-12 text-center space-y-6">
              <div className="h-20 w-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
                <p className="text-muted-foreground">The profile you"re looking for doesn"t exist or you don't have permission to view it.</p>
              </div>
              <Button onClick={() => navigate({ to: '/dashboard' })} size='lg'>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </LazyDashboardLayout>
    );
  }
  
  return (
    <LazyDashboardLayout>
      <div className="min-h-screen pb-12">
        {/* Hero section with enhanced gradient and pattern */}
        <div className="relative h-80 md:h-96 bg-gradient-to-br from-primary/30 via-purple-500/25 to-pink-500/30 overflow-hidden">
          {/* Enhanced animated grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          {/* Subtle radial gradient for depth */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-transparent via-transparent to-primary/10" />
          
          {/* Cover image if available */}
          {user.coverImage && (
            <img 
              src={user.coverImage} 
              alt="" 
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
          
          {/* Back button */}
          <BlurFade delay={0.1}>
            <Button
              variant="ghost"
              onClick={() => navigate({ to: '/dashboard/teams' })}
              className="absolute top-6 left-6 backdrop-blur-sm bg-background/80 hover:bg-background/90"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Button>
          </BlurFade>
          
          {/* Profile completeness badge */}
          {isOwnProfile && profileCompleteness < 100 && (
            <BlurFade delay={0.15}>
              <div className="absolute top-6 right-6">
                <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                  Profile {profileCompleteness}% Complete
                </Badge>
              </div>
            </BlurFade>
          )}
        </div>
        
        {/* Main content */}
        <div className="max-w-7xl mx-auto px-6 -mt-32 relative z-10">
          <BlurFade delay={0.2}>
            {/* Profile header card */}
            <Card className="mb-8 overflow-hidden border-primary/20 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Avatar with enhanced animated border */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-48 w-48 md:h-56 md:w-56 border-4 border-background shadow-2xl ring-4 ring-primary/30 ring-offset-4 ring-offset-background">
                      <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                      <AvatarFallback className="text-6xl md:text-7xl bg-gradient-to-br from-primary via-purple-600 to-pink-600 text-white font-bold">
                        {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <BorderBeam size={224} duration={12} delay={0} borderWidth={2} />
                    {/* Enhanced glow effect */}
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl -z-10 scale-110" />
                  </div>
                  
                  {/* User information */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-600 to-pink-600">
                        {user.name}
                      </h1>
                      {user.headline && (
                        <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed">{user.headline}</p>
                      )}
                    </div>
                    
                    {/* Meta info grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      {user.jobTitle && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Briefcase className="h-4 w-4 text-primary" />
                          </div>
                          <span>{user.jobTitle}</span>
                        </div>
                      )}
                      {user.company && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>
                          <span>{user.company}</span>
                        </div>
                      )}
                      {user.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <MapPin className="h-4 w-4 text-green-600" />
                          </div>
                          <span>{user.location}</span>
                        </div>
                      )}
                      {user.timezone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <Clock className="h-4 w-4 text-purple-600" />
                          </div>
                          <span>{user.timezone}</span>
                        </div>
                      )}
                      {user.joinedAt && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="p-2 rounded-lg bg-orange-500/10">
                            <Calendar className="h-4 w-4 text-orange-600" />
                          </div>
                          <span>Joined {format(new Date(user.joinedAt), 'MMM yyyy')}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Social links */}
                    {(user.email || user.phone || user.linkedinUrl || user.githubUrl || user.twitterUrl || user.website) && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Connect
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {user.email && (
                            <a
                              href={`mailto:${user.email}`}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-all hover:scale-105"
                            >
                              <Mail className="h-4 w-4" />
                              <span className="text-sm">{user.email}</span>
                            </a>
                          )}
                          {user.phone && (
                            <a
                              href={`tel:${user.phone}`}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-all hover:scale-105"
                            >
                              <Phone className="h-4 w-4" />
                              <span className="text-sm">{user.phone}</span>
                            </a>
                          )}
                          {user.linkedinUrl && (
                            <a
                              href={user.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 hover:scale-110 transition-all"
                            >
                              <Linkedin className="h-5 w-5" />
                            </a>
                          )}
                          {user.githubUrl && (
                            <a
                              href={user.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-lg bg-foreground/10 hover:bg-foreground/20 hover:scale-110 transition-all"
                            >
                              <Github className="h-5 w-5" />
                            </a>
                          )}
                          {user.twitterUrl && (
                            <a
                              href={user.twitterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 hover:scale-110 transition-all"
                            >
                              <Twitter className="h-5 w-5" />
                            </a>
                          )}
                          {user.website && (
                            <a
                              href={user.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 hover:scale-110 transition-all"
                            >
                              <Globe className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    {!isOwnProfile && (
                      <div className="flex items-center gap-3 pt-2">
                        <ShimmerButton 
                          className="shadow-lg"
                          onClick={() => {
                            // TODO: Implement messaging - navigate to DM with user
                            navigate({ to: '/dashboard/chat', search: { userId } });
                          }}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Message
                        </ShimmerButton>
                        <Button 
                          variant="outline" 
                          className="group"
                          onClick={() => setShowKudosModal(true)}
                        >
                          <Award className="h-4 w-4 mr-2 group-hover:text-amber-500 transition-colors" />
                          Give Kudos
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </BlurFade>
          
          {/* Statistics grid with enhanced Magic Cards */}
          <BlurFade delay={0.3}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <MagicCard className="p-6 md:p-8 text-center group cursor-pointer hover:scale-[1.02] transition-all duration-300 hover:shadow-xl" gradientColor="#3B82F6">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 ring-2 ring-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Target className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-blue-400">
                    <NumberTicker value={profile.goals?.stats?.active || 0} />
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground font-semibold uppercase tracking-wide">Active Goals</p>
                  {profile.goals?.stats?.completed > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {profile.goals.stats.completed} completed
                    </p>
                  )}
                </div>
              </MagicCard>
              
              <MagicCard className="p-6 md:p-8 text-center group cursor-pointer hover:scale-[1.02] transition-all duration-300 hover:shadow-xl" gradientColor="#F59E0B">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 ring-2 ring-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-amber-600 to-amber-400">
                    <NumberTicker value={profile.achievements?.stats?.totalUnlocked || 0} />
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground font-semibold uppercase tracking-wide">Achievements</p>
                  {profile.achievements?.stats?.rare > 0 && (
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-600 border-none">
                      {profile.achievements.stats.rare} rare+
                    </Badge>
                  )}
                </div>
              </MagicCard>
              
              <MagicCard className="p-6 md:p-8 text-center group cursor-pointer hover:scale-[1.02] transition-all duration-300 hover:shadow-xl" gradientColor="#EF4444">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 ring-2 ring-orange-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Flame className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-orange-600 to-orange-400">
                    <NumberTicker value={profile.streaks?.longest || 0} />
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground font-semibold uppercase tracking-wide">Longest Streak</p>
                  {profile.streaks?.current > 0 && (
                    <p className="text-xs md:text-sm text-orange-600 font-medium">
                      🔥 {profile.streaks.current} days active
                    </p>
                  )}
                </div>
              </MagicCard>
              
              <MagicCard className="p-6 md:p-8 text-center group cursor-pointer hover:scale-[1.02] transition-all duration-300 hover:shadow-xl" gradientColor="#10B981">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 ring-2 ring-green-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Star className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-green-600 to-green-400">
                    <NumberTicker value={profile.kudos?.received || 0} />
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground font-semibold uppercase tracking-wide">Kudos Received</p>
                  {profile.kudos?.given > 0 && (
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {profile.kudos.given} given
                    </p>
                  )}
                </div>
              </MagicCard>
            </div>
          </BlurFade>
          
          {/* Main content area */}
          <BlurFade delay={0.4}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sidebar */}
              <div className="space-y-6">
                {/* Bio with enhanced styling */}
                {user.bio && (
                  <Card className="bg-gradient-to-br from-background via-primary/5 to-background border-primary/20 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6 md:p-8 space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" />
                        About
                      </h3>
                      <p className="text-base md:text-lg text-foreground leading-relaxed">{user.bio}</p>
                    </CardContent>
                  </Card>
                )}
                
                {/* Teams */}
                {profile.teams && profile.teams.length > 0 && (
                  <Card className="overflow-hidden">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Teams
                        </span>
                        <Badge variant="secondary">{profile.teams.length}</Badge>
                      </h3>
                      <div className="space-y-2">
                        {profile.teams.map((team: any) => (
                          <div
                            key={team.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-muted/50 to-transparent hover:from-muted hover:shadow-sm transition-all group cursor-pointer"
                          >
                            <span className="text-sm font-medium group-hover:text-primary transition-colors">
                              {team.name}
                            </span>
                            <Badge variant="outline" className="text-xs group-hover:border-primary transition-colors">
                              {team.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Leaderboard rank */}
                {profile.leaderboard && (
                  <Card className="overflow-hidden border-amber-500/20">
                    <CardContent className="p-6">
                      <h3 className="font-semibold flex items-center gap-2 mb-4">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        Leaderboard
                      </h3>
                      <div className="text-center space-y-3">
                        <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20">
                          <Trophy className="h-12 w-12 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-amber-600 to-amber-400">
                            #{profile.leaderboard.rank}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            <NumberTicker value={profile.leaderboard.score} /> points
                          </p>
                        </div>
                        <div className="flex justify-center gap-2">
                          <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-none">
                            Top {Math.round((profile.leaderboard.rank / 100) * 100)}%
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Main content tabs */}
              <div className="lg:col-span-2">
                <Card className="overflow-hidden border-primary/20">
                  <CardContent className="p-6">
                    <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
                      <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted/50">
                        <TabsTrigger 
                          value="overview"
                          className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Overview
                        </TabsTrigger>
                        <TabsTrigger 
                          value="work"
                          className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                          <Briefcase className="h-4 w-4 mr-2" />
                          Work
                        </TabsTrigger>
                        <TabsTrigger 
                          value="analytics"
                          className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-600 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Analytics
                        </TabsTrigger>
                        <TabsTrigger 
                          value="goals"
                          className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                          <Target className="h-4 w-4 mr-2" />
                          Goals
                        </TabsTrigger>
                        <TabsTrigger 
                          value="achievements"
                          className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-600 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          Achievements
                        </TabsTrigger>
                        <TabsTrigger 
                          value="activity"
                          className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-600 data-[state=active]:to-green-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                          <Flame className="h-4 w-4 mr-2" />
                          Activity
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="overview" className="mt-6 space-y-6">
                        {/* Projects */}
                        {profile.projects && profile.projects.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-primary" />
                              Projects ({profile.projects.length})
                            </h3>
                            <div className="grid gap-3">
                              {profile.projects.map((project: any) => (
                                <div
                                  key={project.id}
                                  className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-background to-muted/30 hover:shadow-md transition-all group cursor-pointer"
                                >
                                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                                    {project.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs group-hover:border-primary transition-colors">
                                    {project.role}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Performance summary */}
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="border-blue-500/20">
                            <CardContent className="p-5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Completion Rate</span>
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              </div>
                              <div className="text-3xl font-bold">
                                {profile.goals?.stats?.completionRate || 0}%
                              </div>
                              <Progress value={profile.goals?.stats?.completionRate || 0} className="h-2" />
                            </CardContent>
                          </Card>
                          
                          <Card className="border-purple-500/20">
                            <CardContent className="p-5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Profile Views</span>
                                <Eye className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="text-3xl font-bold">
                                <NumberTicker value={user.viewCount || 0} />
                              </div>
                              <p className="text-xs text-muted-foreground">Total views</p>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="goals" className="mt-6 space-y-4">
                        {profile.goals?.active && profile.goals.active.length > 0 ? (
                          <div className="space-y-4">
                            {profile.goals.active.map((goal: any, index: number) => (
                              <Card 
                                key={goal.id} 
                                className="overflow-hidden group hover:shadow-xl hover:border-blue-500/50 transition-all cursor-pointer"
                              >
                                <CardContent className="p-6 space-y-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-lg bg-blue-500/10">
                                          <Target className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <h4 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
                                          {goal.title}
                                        </h4>
                                      </div>
                                      {goal.description && (
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                          {goal.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <div className="text-4xl font-bold text-blue-600">
                                        {goal.progress}%
                                      </div>
                                      {goal.deadline && (
                                        <Badge variant="outline" className="text-xs">
                                          <Calendar className="h-3 w-3 mr-1" />
                                          {format(new Date(goal.deadline), 'MMM dd')}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground">Progress</span>
                                      <span className="font-medium">{goal.progress}%</span>
                                    </div>
                                    <Progress 
                                      value={goal.progress} 
                                      className="h-3 bg-muted/50" 
                                    />
                                    {goal.keyResults && goal.keyResults.length > 0 && (
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                                        <Target className="h-3 w-3" />
                                        {goal.keyResults.length} key results
                                        {goal.keyResults.filter((kr: any) => kr.isCompleted).length > 0 && (
                                          <span className="text-green-600">
                                            · {goal.keyResults.filter((kr: any) => kr.isCompleted).length} completed
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <div className="inline-flex p-8 rounded-full bg-muted/50 mb-6">
                              <Target className="h-16 w-16 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Active Goals</h3>
                            <p className="text-muted-foreground">
                              {isOwnProfile ? "Set some goals to get started!" : "This user hasn't set any goals yet."}
                            </p>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="achievements" className="mt-6">
                        {profile.achievements?.unlocked && profile.achievements.unlocked.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {profile.achievements.unlocked.map((achievement: any) => (
                              <Card 
                                key={achievement.id}
                                className={cn(
                                  "overflow-hidden group cursor-pointer hover:scale-105 transition-all relative",
                                  achievement.rarity === 'legendary' && 'border-purple-500/50 shadow-lg shadow-purple-500/20',
                                  achievement.rarity === 'epic' && 'border-pink-500/50 shadow-lg shadow-pink-500/20',
                                  achievement.rarity === 'rare' && 'border-blue-500/50'
                                )}
                              >
                                {achievement.rarity === 'legendary' && (
                                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-transparent" />
                                )}
                                <CardContent className="p-6 text-center space-y-3 relative">
                                  <div className="text-6xl drop-shadow-lg">
                                    {achievement.icon || '🏆'}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold group-hover:text-primary transition-colors">
                                      {achievement.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {achievement.description}
                                    </p>
                                  </div>
                                  <Badge 
                                    className={cn(
                                      "text-xs",
                                      achievement.rarity === 'legendary' && 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none shadow-lg',
                                      achievement.rarity === 'epic' && 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-none',
                                      achievement.rarity === 'rare' && 'bg-blue-500/20 text-blue-600 border-blue-500/30'
                                    )}
                                  >
                                    {achievement.rarity}
                                  </Badge>
                                  {achievement.unlockedAt && (
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(achievement.unlockedAt), 'MMM dd, yyyy')}
                                    </p>
                                  )}
                                  {achievement.rarity === 'legendary' && (
                                    <Sparkles className="absolute top-2 right-2 h-5 w-5 text-purple-500 animate-pulse" />
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <div className="inline-flex p-8 rounded-full bg-muted/50 mb-6">
                              <Trophy className="h-16 w-16 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
                            <p className="text-muted-foreground">
                              {isOwnProfile ? "Complete tasks to unlock achievements!" : "This user hasn't unlocked any achievements yet."}
                            </p>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="activity" className="mt-6 space-y-6">
                        {/* Recent kudos */}
                        {profile.kudos?.recent && profile.kudos.recent.length > 0 ? (
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Star className="h-4 w-4 text-amber-500" />
                              Recent Kudos
                            </h3>
                            <div className="space-y-3">
                              {profile.kudos.recent.map((kudos: any) => (
                                <Card key={kudos.id} className="overflow-hidden hover:shadow-lg transition-all">
                                  <CardContent className="p-5">
                                    <div className="flex items-start gap-4">
                                      <div className="text-4xl">{kudos.emoji || "⭐"}</div>
                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium">{kudos.fromName}</span>
                                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                          <Badge variant="secondary" className="text-xs capitalize">
                                            {kudos.category?.replace('_', ' ')}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-foreground leading-relaxed">
                                          {kudos.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {format(new Date(kudos.createdAt), 'MMM dd, yyyy')}
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <div className="inline-flex p-8 rounded-full bg-muted/50 mb-6">
                              <Star className="h-16 w-16 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
                            <p className="text-muted-foreground">
                              Activity will appear here as it happens
                            </p>
                          </div>
                        )}
                      </TabsContent>
                      
                      {/* Work Tab - NEW */}
                      <TabsContent value="work" className="mt-6 space-y-6">
                        <div className="grid lg:grid-cols-2 gap-6">
                          <ActiveProjects userId={userId} />
                          <RecentTasks userId={userId} />
                        </div>
                        <div className="grid lg:grid-cols-3 gap-6">
                          <WorkloadIndicator userId={userId} />
                          <AvailabilityStatus userId={userId} />
                          <FrequentCollaborators userId={userId} limit={5} />
                        </div>
                        <ActivityFeed userId={userId} limit={20} />
                        <TeamsEnhanced userId={userId} />
                      </TabsContent>
                      
                      {/* Analytics Tab - NEW */}
                      <TabsContent value="analytics" className="mt-6 space-y-6">
                        {isOwnProfile ? (
                          <>
                            <ProfileInsights userId={userId} />
                            <div className="grid lg:grid-cols-2 gap-6">
                              <CompletenessScore userId={userId} />
                              <OptimizationSuggestions userId={userId} />
                            </div>
                            <ProfileViewers userId={userId} />
                            <UserStatisticsCards userId={userId} />
                          </>
                        ) : (
                          <>
                            <UserStatisticsCards userId={userId} />
                          </>
                        )}
                        <BadgeCollection userId={userId} />
                        <WorkHistoryTimeline userId={userId} />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
      
      {/* Give Kudos Modal */}
      {!isOwnProfile && user && (
        <GiveKudosModal
          open={showKudosModal}
          onOpenChange={setShowKudosModal}
          recipientEmail={user.email}
          recipientName={user.name}
        />
      )}
    </LazyDashboardLayout>
  );
}
