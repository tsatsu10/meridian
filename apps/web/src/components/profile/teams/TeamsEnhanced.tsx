/**
 * 👥 Enhanced Teams Component
 * 
 * Shows team memberships with roles, tenure, and primary team
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Calendar } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getTeamCollaborations, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/cn";

interface TeamsEnhancedProps {
  userId: string;
  className?: string;
}

const roleColors = {
  lead: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  member: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

export function TeamsEnhanced({ userId, className }: TeamsEnhancedProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.teams(userId),
    queryFn: () => getTeamCollaborations(userId),
    staleTime: 3 * 60 * 1000,
  });

  const teamsData = data?.data || { teams: [], totalTeams: 0, leadingTeams: 0, primaryTeam: null };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Teams & Collaborations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (teamsData.teams.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Teams & Collaborations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Not a member of any teams</p>
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
          Teams & Collaborations
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary">{teamsData.totalTeams} teams</Badge>
            {teamsData.leadingTeams > 0 && (
              <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30">
                <Crown className="h-3 w-3 mr-1" />
                {teamsData.leadingTeams} lead
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teamsData.teams.map((team: any) => (
            <div
              key={team.id}
              className={cn(
                "p-4 rounded-lg border transition-all hover:border-primary",
                team.isPrimaryTeam && "border-primary bg-primary/5"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: team.color + "30", color: team.color }}
                  >
                    {team.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{team.name}</h4>
                      {team.isPrimaryTeam && (
                        <Badge variant="default" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-xs", roleColors[team.role as keyof typeof roleColors])}>
                  {team.role}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {team.memberCount} members
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {team.tenureDays > 0
                    ? formatDistanceToNow(new Date(Date.now() - team.tenureDays * 24 * 60 * 60 * 1000), { addSuffix: true })
                    : "Just joined"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

