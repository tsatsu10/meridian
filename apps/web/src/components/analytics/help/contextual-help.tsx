// @epic-2.1-workflow: Contextual help system for analytics
// @persona-sarah: PM needs quick access to feature documentation
// @persona-mike: Developer needs technical context for analytics features

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HelpCircle,
  Book,
  Video,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface HelpItem {
  id: string;
  title: string;
  description: string;
  type: "tooltip" | "hover" | "modal";
  category: "feature" | "technical" | "workflow" | "best-practice";
  content?: {
    text?: string;
    links?: Array<{
      title: string;
      url: string;
      type: "doc" | "video" | "external";
    }>;
    examples?: Array<{
      title: string;
      description: string;
    }>;
  };
}

interface ContextualHelpProps {
  itemId: string;
  children: React.ReactNode;
  className?: string;
}

// Help content database
const HELP_ITEMS: Record<string, HelpItem> = {
  "analytics-overview": {
    id: "analytics-overview",
    title: "Analytics Overview",
    description: "Comprehensive analytics dashboard with real-time insights",
    type: "hover",
    category: "feature",
    content: {
      text: "The analytics overview provides a high-level view of your workspace metrics, including project health, team productivity, and key performance indicators.",
      links: [
        {
          title: "Analytics Documentation",
          url: "/docs/analytics",
          type: "doc",
        },
        {
          title: "Video Tutorial",
          url: "/tutorials/analytics",
          type: "video",
        },
      ],
    },
  },
  "create-task": {
    id: "create-task",
    title: "Create Task from Insight",
    description: "Convert analytics insights into actionable tasks",
    type: "tooltip",
    category: "workflow",
    content: {
      text: "Click to create a task directly from this insight. The task will automatically include relevant context and metrics.",
    },
  },
  "drill-down": {
    id: "drill-down",
    title: "Drill-Down Navigation",
    description: "Navigate through detailed analytics views",
    type: "hover",
    category: "feature",
    content: {
      text: "Use drill-down navigation to explore detailed metrics and insights at different levels: workspace, project, team, or individual.",
      examples: [
        {
          title: "Project Analysis",
          description: "Click on a project to view detailed metrics and team performance",
        },
        {
          title: "Team Deep-Dive",
          description: "Select a team to analyze productivity and resource allocation",
        },
      ],
    },
  },
  "keyboard-shortcuts": {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    description: "Navigate analytics efficiently with keyboard shortcuts",
    type: "hover",
    category: "technical",
    content: {
      text: "Press '?' to view all available keyboard shortcuts. Common shortcuts include:",
      examples: [
        {
          title: "Navigation",
          description: "Use 'g + h' for home, 'g + p' for projects view",
        },
        {
          title: "Actions",
          description: "Press 'c + t' to create task, 'r' to refresh data",
        },
      ],
    },
  },
};

function getHelpIcon(category: HelpItem["category"]) {
  switch (category) {
    case "technical":
      return Info;
    case "workflow":
      return ChevronRight;
    case "best-practice":
      return Book;
    default:
      return HelpCircle;
  }
}

function getLinkIcon(type: string) {
  switch (type) {
    case "doc":
      return Book;
    case "video":
      return Video;
    case "external":
      return ExternalLink;
    default:
      return ExternalLink;
  }
}

export function ContextualHelp({ itemId, children, className }: ContextualHelpProps) {
  const helpItem = HELP_ITEMS[itemId];
  
  if (!helpItem) {
    console.warn(`Help item not found for ID: ${itemId}`);
    return <>{children}</>;
  }

  const HelpIcon = getHelpIcon(helpItem.category);

  // Simple tooltip for basic help
  if (helpItem.type === "tooltip") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={className}>{children}</div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <div className="flex items-start gap-2">
              <HelpIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{helpItem.title}</p>
                <p className="text-sm text-muted-foreground">{helpItem.description}</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Hover card for detailed help
  if (helpItem.type === "hover") {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className={className}>{children}</div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="flex justify-between space-x-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">{helpItem.title}</h4>
              <p className="text-sm text-muted-foreground">
                {helpItem.description}
              </p>
              <div className="flex items-center pt-2">
                <Badge variant="secondary" className="text-xs">
                  {helpItem.category}
                </Badge>
              </div>
            </div>
            <HelpIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
          </div>
          
          {helpItem.content && (
            <ScrollArea className="h-fit max-h-[300px] mt-4">
              {helpItem.content.text && (
                <p className="text-sm text-muted-foreground mb-4">
                  {helpItem.content.text}
                </p>
              )}
              
              {helpItem.content.examples && helpItem.content.examples.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-sm font-medium">Examples</h5>
                  {helpItem.content.examples.map((example, index) => (
                    <div key={index} className="rounded-md border p-3">
                      <h6 className="text-sm font-medium mb-1">{example.title}</h6>
                      <p className="text-sm text-muted-foreground">
                        {example.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              {helpItem.content.links && helpItem.content.links.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h5 className="text-sm font-medium">Learn More</h5>
                  {helpItem.content.links.map((link, index) => {
                    const LinkIcon = getLinkIcon(link.type);
                    return (
                      <Button
                        key={index}
                        variant="ghost"
                        className="w-full justify-start text-sm"
                        onClick={() => window.open(link.url, "_blank")}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {link.title}
                      </Button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          )}
        </HoverCardContent>
      </HoverCard>
    );
  }

  // Fallback to direct rendering
  return <>{children}</>;
}

export type { HelpItem, ContextualHelpProps };