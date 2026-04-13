/**
 * 👥 Team Member Profile Modal - ULTRA-MODERN REDESIGN
 * 
 * Beautiful profile modal with cutting-edge design:
 * - Advanced glassmorphism with backdrop blur
 * - Smooth micro-interactions and animations
 * - Gradient accents and color schemes
 * - Professional typography hierarchy
 * - Enhanced visual depth with shadows and overlays
 * - Interactive hover states
 * - Mobile-responsive design
 */

import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import { useRouter } from '@tanstack/react-router';
import { 
  MessageCircle, 
  Award, 
  ExternalLink,
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
  Target,
  Star,
  Users,
  Sparkles,
  ChevronRight,
  X,
  Video,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import NumberTicker from "@/components/magicui/number-ticker";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { BorderBeam } from "@/components/magicui/border-beam";
import { GiveKudosModal } from "@/components/team/give-kudos-modal";
import { motion, AnimatePresence } from "framer-motion";

interface TeamMemberProfileModalProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  onViewFull?: () => void;
  onMessage?: () => void;
  onGiveKudos?: () => void;
}

export function TeamMemberProfileModal({
  userId,
  open,
  onClose,
  onViewFull,
  onMessage,
  onGiveKudos,
}: TeamMemberProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'activity'>('overview');
  const [showKudosModalInternal, setShowKudosModalInternal] = useState(false);
  const [showScheduleCallModal, setShowScheduleCallModal] = useState(false);
  const router = useRouter();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      const response = await api.get(`/api/profile/${userId}/public`);
      // API returns {success: true, data: profileData}
      return response?.data || response;
    },
    enabled: open && !!userId,
  });
  
  const profile = data?.data || data;
  const user = profile?.user;
  const isOwnProfile = profile?.isOwnProfile;
  
  if (!open) return null;
  
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden border-none p-0">
          <div className="relative h-[600px] bg-gradient-to-br from-primary/5 via-background to-purple-500/5 animate-pulse">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20" />
                <div className="h-8 w-48 rounded-lg bg-muted/50" />
                <div className="h-4 w-32 rounded bg-muted/30" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!profile || !user) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Not Available</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {error ? `Error loading profile` : 'Unable to load profile data'}
            </p>
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Calculate profile completeness
  const profileFields = [
    user.bio, user.jobTitle, user.company, user.location, 
    user.phone, user.linkedinUrl, user.githubUrl, user.website
  ];
  const filledFields = profileFields.filter(Boolean).length;
  const profileCompleteness = Math.round((filledFields / profileFields.length) * 100);
  
  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden border-none p-0 gap-0 bg-gradient-to-br from-background via-background to-primary/5">
            <DialogHeader className="sr-only">
              <DialogTitle>{user.name}'s Profile</DialogTitle>
              <DialogDescription>
                View {user.name}'s profile information, stats, and activity
              </DialogDescription>
            </DialogHeader>
            
            {/* Header with ultra-modern gradient background */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative h-56 bg-gradient-to-br from-primary/40 via-purple-500/30 to-pink-500/40 overflow-hidden"
            >
              {/* Animated gradient mesh */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />
              
              {/* Floating orbs for depth */}
              <div className="absolute top-10 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-10 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
              
              {/* Radial gradient overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-transparent via-transparent to-background/30" />
              
              {user.coverImage && (
                <motion.img 
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.5 }}
                  transition={{ duration: 0.6 }}
                  src={user.coverImage} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              
              {/* Close button with enhanced styling */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 bg-background/90 backdrop-blur-md hover:bg-background hover:scale-110 transition-all shadow-lg border border-border/50"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
              
              {/* Profile avatar - enhanced with animations */}
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="absolute bottom-0 left-8 transform translate-y-1/2 z-10"
              >
                <div className="relative group">
                  <Avatar className="h-40 w-40 border-[6px] border-background shadow-2xl ring-4 ring-primary/40 ring-offset-4 ring-offset-background transition-all group-hover:ring-primary/60 group-hover:scale-105 duration-300">
                    <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                    <AvatarFallback className="text-5xl bg-gradient-to-br from-primary via-purple-600 to-pink-600 text-white font-bold">
                      {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <BorderBeam size={190} duration={10} delay={0} borderWidth={3} />
                  {/* Animated glow effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/30 via-purple-500/30 to-pink-500/30 blur-2xl -z-10 animate-pulse" />
                  
                  {/* Online status indicator */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-background shadow-lg"
                  >
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
                  </motion.div>
                </div>
              </motion.div>
              
              {/* Profile completeness indicator - enhanced */}
              {!isOwnProfile && profileCompleteness < 100 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute bottom-4 right-4"
                >
                  <Badge variant="secondary" className="backdrop-blur-md bg-background/90 border border-border/50 shadow-lg px-3 py-1.5">
                    <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
                    {profileCompleteness}% Complete
                  </Badge>
                </motion.div>
              )}
            </motion.div>
        
            {/* Content area with refined spacing and animations */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="pt-24 pb-8 px-8 space-y-8 overflow-y-auto max-h-[calc(90vh-13rem)] scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent hover:scrollbar-thumb-primary/50"
            >
              {/* User basic info with enhanced typography */}
              <div className="space-y-5">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-primary to-purple-600">
                    {user.name}
                  </h1>
                  {user.headline && (
                    <p className="text-lg md:text-2xl text-muted-foreground font-medium leading-relaxed">{user.headline}</p>
                  )}
                </motion.div>
                
                {/* Meta information with enhanced icon cards */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap gap-3"
                >
                  {user.jobTitle && (
                    <motion.div 
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 text-sm text-foreground shadow-sm hover:shadow-md transition-all cursor-default"
                    >
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{user.jobTitle}</span>
                    </motion.div>
                  )}
                  {user.company && (
                    <motion.div 
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-sm text-foreground shadow-sm hover:shadow-md transition-all cursor-default"
                    >
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold">{user.company}</span>
                    </motion.div>
                  )}
                  {user.location && (
                    <motion.div 
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 text-sm text-foreground shadow-sm hover:shadow-md transition-all cursor-default"
                    >
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="font-semibold">{user.location}</span>
                    </motion.div>
                  )}
                  {user.timezone && (
                    <motion.div 
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-sm text-foreground shadow-sm hover:shadow-md transition-all cursor-default"
                    >
                      <Clock className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold">{user.timezone}</span>
                    </motion.div>
                  )}
                </motion.div>
                
                {/* Action buttons with refined spacing and enhanced effects */}
                {!isOwnProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-wrap items-center gap-3 pt-4"
                  >
                    <ShimmerButton 
                      onClick={() => {
                        if (onMessage) {
                          onMessage();
                        } else {
                          // Navigate to chat with this user
                          toast.success(`Opening chat with ${user.name}...`, {
                            description: 'Redirecting to messages',
                          });
                          setTimeout(() => {
                            router.navigate({ to: '/dashboard/chat', search: { userId } });
                          }, 500);
                        }
                      }} 
                      className="shadow-lg hover:shadow-2xl transition-all hover:scale-105"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </ShimmerButton>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (onGiveKudos) {
                          onGiveKudos();
                        } else {
                          setShowKudosModalInternal(true);
                        }
                      }} 
                      className="group border-2 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 hover:scale-105 transition-all shadow-md hover:shadow-lg"
                    >
                      <Award className="h-4 w-4 mr-2 group-hover:text-amber-500 group-hover:rotate-12 transition-all" />
                      Give Kudos
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Open calendar/scheduling UI
                        toast.success(`Scheduling call with ${user.name}...`, {
                          description: 'Opening calendar integration',
                          action: {
                            label: 'Open Calendar',
                            onClick: () => {
                              router.navigate({ to: '/dashboard/calendar', search: { scheduleWith: userId } });
                            },
                          },
                        });
                      }}
                      className="hover:scale-105 transition-all shadow-sm hover:shadow-md"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Schedule Call
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        if (onViewFull) {
                          onViewFull();
                        } else {
                          // Navigate to full profile page
                          router.navigate({ to: `/dashboard/profile/${userId}` });
                        }
                      }} 
                      className="hover:bg-muted hover:scale-105 transition-all"
                    >
                      <span className="mr-2">View Full Profile</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                )}
              </div>
          
              <Separator className="my-6 opacity-50" />
              
              {/* Stats grid with ultra-enhanced Magic Cards */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6 max-w-2xl mx-auto"
              >
                <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                  <MagicCard className="p-6 text-center cursor-pointer transition-all duration-300 hover:shadow-2xl border-2 border-transparent hover:border-blue-500/30" gradientColor="#3B82F6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 ring-4 ring-blue-500/20 shadow-lg">
                        <Target className="h-7 w-7 text-blue-600" />
                      </div>
                      <div className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400">
                        <NumberTicker value={profile.goals?.stats?.active || 0} />
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground font-bold uppercase tracking-wider">Active Goals</p>
                    </div>
                  </MagicCard>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                  <MagicCard className="p-6 text-center cursor-pointer transition-all duration-300 hover:shadow-2xl border-2 border-transparent hover:border-green-500/30" gradientColor="#10B981">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/20 ring-4 ring-green-500/20 shadow-lg">
                        <Star className="h-7 w-7 text-green-600" />
                      </div>
                      <div className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-green-600 via-green-500 to-green-400">
                        <NumberTicker value={profile.kudos?.received || 0} />
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground font-bold uppercase tracking-wider">Kudos</p>
                    </div>
                  </MagicCard>
                </motion.div>
              </motion.div>
          
          {/* Bio section with enhanced glassmorphism */}
          {user.bio && (
            <Card className="bg-gradient-to-br from-background via-primary/5 to-background border-primary/20 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 md:p-8">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  About
                </h3>
                <p className="text-foreground leading-relaxed text-base md:text-lg">{user.bio}</p>
              </CardContent>
            </Card>
          )}
          
          {/* Tabs for detailed information with refined styling */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'goals' | 'activity')} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 h-12">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all font-medium">
                Overview
              </TabsTrigger>
              <TabsTrigger value="goals" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-medium">
                Goals
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-600 data-[state=active]:to-green-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-medium">
                Activity
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Contact information */}
              <Card className="overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    {user.email && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${user.email}`} className="text-sm hover:text-primary transition-colors">
                          {user.email}
                        </a>
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${user.phone}`} className="text-sm hover:text-primary transition-colors">
                          {user.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {/* Social links */}
                  {(user.linkedinUrl || user.githubUrl || user.twitterUrl || user.website) && (
                    <div className="pt-4">
                      <h4 className="text-sm font-medium mb-3">Connect</h4>
                      <div className="flex items-center gap-3">
                        {user.linkedinUrl && (
                          <a
                            href={user.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 hover:scale-110 transition-all"
                          >
                            <Linkedin className="h-5 w-5" />
                          </a>
                        )}
                        {user.githubUrl && (
                          <a
                            href={user.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 hover:scale-110 transition-all"
                          >
                            <Github className="h-5 w-5" />
                          </a>
                        )}
                        {user.twitterUrl && (
                          <a
                            href={user.twitterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 hover:scale-110 transition-all"
                          >
                            <Twitter className="h-5 w-5" />
                          </a>
                        )}
                        {user.website && (
                          <a
                            href={user.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 hover:scale-110 transition-all"
                          >
                            <Globe className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Teams & Projects in a grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Teams */}
                {profile.teams && profile.teams.length > 0 && (
                  <Card className="overflow-hidden border-primary/20">
                    <CardContent className="p-6">
                      <h3 className="font-semibold flex items-center gap-2 mb-4">
                        <Users className="h-4 w-4 text-primary" />
                        Teams ({profile.teams.length})
                      </h3>
                      <div className="space-y-2">
                        {profile.teams.slice(0, 3).map((team: any) => (
                          <div
                            key={team.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 transition-colors group cursor-pointer"
                          >
                            <span className="text-sm font-medium group-hover:text-primary transition-colors">{team.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {team.role}
                            </Badge>
                          </div>
                        ))}
                        {profile.teams.length > 3 && (
                          <Button variant="ghost" size="sm" className="w-full" onClick={onViewFull}>
                            View all {profile.teams.length} teams
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="goals" className="mt-6 space-y-4">
              {profile.goals?.active && profile.goals.active.length > 0 ? (
                <div className="space-y-4">
                  {profile.goals.active.map((goal: any, index: number) => (
                    <Card key={goal.id} className="overflow-hidden group hover:shadow-lg transition-all">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold group-hover:text-primary transition-colors">
                              {goal.title}
                            </h4>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {goal.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="text-2xl font-bold text-primary">
                              {goal.progress}%
                            </div>
                            {goal.deadline && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(goal.deadline), 'MMM dd')}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Progress value={goal.progress} className="h-2" />
                          {goal.keyResults && goal.keyResults.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Target className="h-3 w-3" />
                              {goal.keyResults.length} key results
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>No active goals yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-6 space-y-4">
              {/* Recent kudos */}
              {profile.kudos?.recent && profile.kudos.recent.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Recent Kudos
                  </h3>
                  {profile.kudos.recent.map((kudos: any) => (
                    <Card key={kudos.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="text-3xl">{kudos.emoji || '⭐'}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium">{kudos.fromName}</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <Badge variant="secondary" className="text-xs capitalize">
                                {kudos.category?.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground">{kudos.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(kudos.createdAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>No recent kudos</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
            </motion.div>
          </DialogContent>
          
          {/* Give Kudos Modal */}
          {!isOwnProfile && user && (
            <GiveKudosModal
              open={showKudosModalInternal}
              onOpenChange={setShowKudosModalInternal}
              recipientEmail={user.email}
              recipientName={user.name}
            />
          )}
        </Dialog>
      )}
    </AnimatePresence>
  );
}

