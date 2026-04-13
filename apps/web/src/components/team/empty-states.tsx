// @epic-3.4-teams: Empty state components for teams page
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Search, Plus, Inbox } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="col-span-full flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="rounded-full bg-muted/50 p-6 mb-6">
        {icon}
      </div>
      <h3 className="text-2xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} size="lg">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

export function NoTeamsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<Users className="h-12 w-12 text-muted-foreground" />}
      title="No teams yet"
      description="Get started by creating your first team to organize your workspace members and projects."
      action={{
        label: "Create Your First Team",
        onClick: onCreate,
      }}
    />
  );
}

export function NoFilteredTeamsEmpty() {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12 text-muted-foreground" />}
      title="No teams found"
      description="Try adjusting your filters or search terms to find what you're looking for."
    />
  );
}

export function NoMembersEmpty() {
  return (
    <EmptyState
      icon={<UserPlus className="h-12 w-12 text-muted-foreground" />}
      title="No team members"
      description="Teams don't have any members yet. Add members to your teams to get started."
    />
  );
}

export function NoFilteredMembersEmpty() {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12 text-muted-foreground" />}
      title="No members found"
      description="Try adjusting your search terms to find team members."
    />
  );
}

export function NoUsersEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<UserPlus className="h-12 w-12 text-muted-foreground" />}
      title="No workspace users"
      description="Invite users to your workspace to start collaborating on projects and tasks."
      action={{
        label: "Invite Your First User",
        onClick: onCreate,
      }}
    />
  );
}

export function NoFilteredUsersEmpty() {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12 text-muted-foreground" />}
      title="No users found"
      description="Try adjusting your search terms to find workspace users."
    />
  );
}

