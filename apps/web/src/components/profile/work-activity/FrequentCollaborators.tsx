/**
 * 🤝 Frequent Collaborators Component
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { ClickableUserProfile } from "@/components/user/clickable-user-profile";
import { getFrequentCollaborators, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import NumberTicker from "@/components/magicui/number-ticker";

interface FrequentCollaboratorsProps {
  userId: string;
  limit?: number;
  className?: string;
}

export function FrequentCollaborators({ userId, limit = 5, className }: FrequentCollaboratorsProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.collaborators(userId),
    queryFn: () => getFrequentCollaborators(userId, limit),
    staleTime: 5 * 60 * 1000,
  });

  const collaborators = data?.data || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Frequent Collaborators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (collaborators.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Frequent Collaborators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No collaborations yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Frequent Collaborators
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {collaborators.map((collab: any, index: number) => {
            const projectCount = collab.sharedProjects?.length || 0;
            const score = parseFloat(collab.collaborationScore) || 0;

            return (
              <div key={collab.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0">
                  {index + 1}
                </Badge>
                
                <ClickableUserProfile
                  userId={collab.collaboratorId}
                  userName={collab.collaboratorName}
                  userAvatar={collab.collaboratorAvatar}
                  size="md"
                  openMode="both"
                  className="flex-1"
                />

                <div className="text-right">
                  <div className="text-sm font-semibold">
                    <NumberTicker value={collab.collaborationCount} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {projectCount} project{projectCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

