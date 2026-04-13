import { useState } from 'react';
import { useKudos } from '@/hooks/use-kudos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GiveKudosModal } from './give-kudos-modal';
import { Award, Plus, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ClickableUserProfile } from '@/components/user/clickable-user-profile';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/cn';

const categoryConfig = {
  helpful: { emoji: '🤝', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  great_work: { emoji: '⭐', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  team_player: { emoji: '👥', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  creative: { emoji: '💡', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  leadership: { emoji: '👑', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
};

export function KudosFeed() {
  const { kudosFeed, loading } = useKudos();
  const navigate = useNavigate();
  const [showGiveModal, setShowGiveModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ email: string; name?: string } | null>(null);
  
  const handleGiveKudos = (email?: string, name?: string) => {
    if (email) {
      setSelectedUser({ email, name });
    }
    setShowGiveModal(true);
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Kudos Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Kudos Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate({ to: '/dashboard/kudos' })}>
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
            <Button size="sm" onClick={() => handleGiveKudos()}>
              <Plus className="h-4 w-4 mr-2" />
              Give Kudos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {kudosFeed.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No kudos yet</p>
              <p className="text-sm">Be the first to recognize your teammates!</p>
              <Button
                className="mt-4"
                onClick={() => handleGiveKudos()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Give Kudos
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {kudosFeed.map((kudos) => {
                const categoryInfo = categoryConfig[kudos.category as keyof typeof categoryConfig] || categoryConfig.great_work;
                return (
                  <div
                    key={kudos.id}
                    className="p-4 rounded-lg border bg-gradient-to-br from-background to-muted/20 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <ClickableUserProfile
                            userEmail={kudos.fromUserEmail}
                            userName={kudos.fromUserName || kudos.fromUserEmail}
                            userAvatar={kudos.fromUserAvatar}
                            size="sm"
                            openMode="both"
                            nameClassName="font-medium text-sm"
                          />
                          <span className="text-muted-foreground text-sm">gave kudos to</span>
                          <ClickableUserProfile
                            userEmail={kudos.toUserEmail}
                            userName={kudos.toUserName || kudos.toUserEmail}
                            userAvatar={kudos.toUserAvatar}
                            size="sm"
                            openMode="both"
                            showAvatar={false}
                            nameClassName="font-medium text-sm"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{kudos.emoji || categoryInfo.emoji}</span>
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs capitalize", categoryInfo.color)}
                          >
                            {kudos.category.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDistanceToNow(kudos.createdAt, { addSuffix: true })}
                          </span>
                        </div>
                        
                        <p className="text-sm text-foreground leading-relaxed">{kudos.message}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>To: {kudos.toUserName || kudos.toUserEmail}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleGiveKudos(kudos.toUserEmail, kudos.toUserName)}
                      >
                        Give kudos too
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <GiveKudosModal
        open={showGiveModal}
        onOpenChange={(open) => {
          setShowGiveModal(open);
          if (!open) {
            setSelectedUser(null);
          }
        }}
        recipientEmail={selectedUser?.email}
        recipientName={selectedUser?.name}
      />
    </>
  );
}

