// @epic-2.1-workflow: Mobile-optimized navigation for analytics
// @persona-sarah: PM needs to access analytics on the go
// @persona-david: Team lead needs mobile access to team metrics

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  BarChart3,
  Menu,
  ChevronRight,
  Users,
  Target,
  AlertTriangle,
  Activity,
  Settings,
  Calendar,
  Clock,
  Search,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { logger } from "../../../lib/logger";

interface MobileNavigationProps {
  currentPath: string[];
  onNavigate: (path: string[]) => void;
  className?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string[];
  children?: NavigationItem[];
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: BarChart3,
    path: ["overview"],
  },
  {
    id: "projects",
    label: "Projects",
    icon: Target,
    path: ["projects"],
    children: [
      {
        id: "active",
        label: "Active Projects",
        icon: Activity,
        path: ["projects", "active"],
      },
      {
        id: "at-risk",
        label: "At Risk",
        icon: AlertTriangle,
        path: ["projects", "at-risk"],
      },
    ],
  },
  {
    id: "teams",
    label: "Teams",
    icon: Users,
    path: ["teams"],
    children: [
      {
        id: "performance",
        label: "Performance",
        icon: Activity,
        path: ["teams", "performance"],
      },
      {
        id: "schedule",
        label: "Schedule",
        icon: Calendar,
        path: ["teams", "schedule"],
      },
    ],
  },
  {
    id: "time",
    label: "Time Tracking",
    icon: Clock,
    path: ["time"],
  },
  {
    id: "settings",
    label: "Analytics Settings",
    icon: Settings,
    path: ["settings"],
  },
];

const QUICK_ACTIONS = [
  {
    id: "search",
    label: "Search Analytics",
    icon: Search,
    shortcut: "⌘K",
  },
  {
    id: "schedule",
    label: "Schedule Report",
    icon: Calendar,
    shortcut: "⌘R",
  },
];

export function MobileNavigation({
  currentPath,
  onNavigate,
  className,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNavigate = (item: NavigationItem) => {
    onNavigate(item.path);
    setIsOpen(false);
  };

  const isActive = (path: string[]) => {
    if (path.length !== currentPath.length) return false;
    return path.every((segment, index) => segment === currentPath[index]);
  };

  const filteredItems = searchQuery
    ? NAVIGATION_ITEMS.flatMap(item => [
        item,
        ...(item.children || []),
      ]).filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : NAVIGATION_ITEMS;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "md:hidden h-9 w-9 px-0",
            className
          )}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:w-80 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Analytics Navigation</SheetTitle>
          <SheetDescription>
            Navigate through different analytics views
          </SheetDescription>
        </SheetHeader>

        <Command>
          <CommandInput
            placeholder="Search analytics views..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Quick Actions */}
            <CommandGroup heading="Quick Actions">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.id}
                    onSelect={() => {
                      // TODO: Implement quick actions
                      logger.info("Quick action:");
                      setIsOpen(false);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{action.label}</span>
                    {action.shortcut && (
                      <kbd className="ml-auto text-xs text-gray-400">
                        {action.shortcut}
                      </kbd>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator />

            {/* Main Navigation */}
            <CommandGroup heading="Navigation">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => handleNavigate(item)}
                    className="px-2"
                  >
                    <div
                      className={cn(
                        "flex items-center w-full p-2 rounded-md",
                        active && "bg-primary/10"
                      )}
                    >
                      <Icon className={cn(
                        "mr-2 h-4 w-4",
                        active && "text-primary"
                      )} />
                      <span className={cn(
                        "flex-1",
                        active && "font-medium text-primary"
                      )}>
                        {item.label}
                      </span>
                      {item.children && (
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {/* Nested Items */}
            {NAVIGATION_ITEMS.map((item) => {
              if (!item.children?.length) return null;

              return (
                <CommandGroup
                  key={`${item.id}-children`}
                  heading={`${item.label} Views`}
                  hidden={!searchQuery}
                >
                  {item.children.map((child) => {
                    const Icon = child.icon;
                    const active = isActive(child.path);

                    return (
                      <CommandItem
                        key={child.id}
                        onSelect={() => handleNavigate(child)}
                        className="px-2"
                      >
                        <div
                          className={cn(
                            "flex items-center w-full p-2 rounded-md",
                            active && "bg-primary/10"
                          )}
                        >
                          <Icon className={cn(
                            "mr-2 h-4 w-4",
                            active && "text-primary"
                          )} />
                          <span className={cn(
                            "flex-1",
                            active && "font-medium text-primary"
                          )}>
                            {child.label}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </SheetContent>
    </Sheet>
  );
}

export type { MobileNavigationProps, NavigationItem };