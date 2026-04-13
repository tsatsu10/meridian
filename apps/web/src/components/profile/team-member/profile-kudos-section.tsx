/**
 * 🎉 Profile Kudos Section
 * 
 * Displays recent kudos received
 */

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Award, Heart } from "lucide-react";
import { format } from "date-fns";

interface ProfileKudosSectionProps {
  kudos: any;
}

const KUDOS_ICONS: Record<string, string> = {
  'great-work': '⭐',
  'helpful': '🤝',
  'creative': '💡',
  'teamwork': '👥',
  'leadership': '👑',
  'problem-solving': '🧩',
};

export function ProfileKudosSection({ kudos }: ProfileKudosSectionProps) {
  const recent = kudos?.recent || [];
  const received = kudos?.received || 0;
  const given = kudos?.given || 0;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Award className="h-4 w-4" />
          Recognition
        </h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
            {received} received
          </span>
          <span className="text-muted-foreground">
            {given} given
          </span>
        </div>
      </div>
      
      {recent.length > 0 ? (
        <div className="space-y-3">
          {recent.map((kudos: any) => (
            <div key={kudos.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{KUDOS_ICONS[kudos.type] || '🎉'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">
                    {kudos.type.replace('-', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(kudos.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                "{kudos.message}"
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No recent kudos
        </p>
      )}
    </div>
  );
}

