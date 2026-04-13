import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/store/settings";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Clock, 
  User, 
  Palette, 
  Bell, 
  Shield, 
  Link, 
  Database,
  Key,
  CreditCard,
  ChevronRight,
  Command,
  Settings
} from "lucide-react";
import { cn } from "@/lib/cn";

// Icon mapping for settings sections with proper typing
const sectionIcons = {
  profile: User as React.FC<{ className?: string }>,
  appearance: Palette as React.FC<{ className?: string }>,
  notifications: Bell as React.FC<{ className?: string }>,
  security: Shield as React.FC<{ className?: string }>,
  "team-management": Settings as React.FC<{ className?: string }>,
  integrations: Link as React.FC<{ className?: string }>,
  data: Database as React.FC<{ className?: string }>,
  api: Key as React.FC<{ className?: string }>,
  billing: CreditCard as React.FC<{ className?: string }>,
} as const;

// Searchable settings with their paths and descriptions
const searchableSettings = [
  // Profile
  { section: "profile", path: "/dashboard/settings/profile", title: "Profile Information", description: "Update your personal details", keywords: ["name", "email", "bio", "avatar", "personal"] },
  { section: "profile", path: "/dashboard/settings/profile", title: "Privacy Preferences", description: "Control profile visibility", keywords: ["privacy", "visibility", "public", "online status"] },
  
  // Appearance
  { section: "appearance", path: "/dashboard/settings/appearance", title: "Theme Selection", description: "Choose light, dark, or system theme", keywords: ["theme", "dark", "light", "colors"] },
  { section: "appearance", path: "/dashboard/settings/appearance", title: "Typography", description: "Adjust font size and readability", keywords: ["font", "text", "size", "typography"] },
  { section: "appearance", path: "/dashboard/settings/appearance", title: "Layout Density", description: "Control spacing and layout", keywords: ["layout", "density", "compact", "spacious"] },
  { section: "appearance", path: "/dashboard/settings/appearance", title: "Accessibility", description: "Animation and contrast settings", keywords: ["accessibility", "animation", "contrast", "motion"] },
  
  // Notifications
  { section: "notifications", path: "/dashboard/settings/notifications", title: "Email Notifications", description: "Configure email alerts", keywords: ["email", "alerts", "notifications"] },
  { section: "notifications", path: "/dashboard/settings/notifications", title: "Push Notifications", description: "Browser notification settings", keywords: ["push", "browser", "desktop"] },
  { section: "notifications", path: "/dashboard/settings/notifications", title: "Sound Settings", description: "Enable or disable notification sounds", keywords: ["sound", "audio", "mute"] },
  
  // Security
  { section: "security", path: "/dashboard/settings/security", title: "Password Management", description: "Change your password", keywords: ["password", "change", "update"] },
  { section: "security", path: "/dashboard/settings/security", title: "Two-Factor Authentication", description: "Enable 2FA for extra security", keywords: ["2fa", "two factor", "authentication", "security"] },
  { section: "security", path: "/dashboard/settings/security", title: "Active Sessions", description: "Manage logged-in devices", keywords: ["sessions", "devices", "logout"] },
  
  // Team Management
  { section: "team-management", path: "/dashboard/settings/team-management", title: "Permission Matrix", description: "Configure role-based permissions", keywords: ["permissions", "roles", "matrix", "access", "team"] },
  { section: "team-management", path: "/dashboard/settings/team-management", title: "Approval Workflows", description: "Set up automated approval processes", keywords: ["approval", "workflow", "automation", "process"] },
  { section: "team-management", path: "/dashboard/settings/team-management", title: "Guest Access", description: "Manage external user access", keywords: ["guest", "external", "access", "collaboration"] },
  { section: "team-management", path: "/dashboard/settings/team-management", title: "Team Hierarchy", description: "Define organizational structure", keywords: ["hierarchy", "organization", "structure", "reporting"] },
  { section: "team-management", path: "/dashboard/settings/team-management", title: "Onboarding Templates", description: "Automate new member onboarding", keywords: ["onboarding", "templates", "automation", "new members"] },
  
  // Integrations
  { section: "integrations", path: "/dashboard/settings/integrations", title: "Connected Services", description: "Manage third-party integrations", keywords: ["integrations", "services", "github", "slack", "google"] },
  
  // Data Management
  { section: "data", path: "/dashboard/settings/data-management", title: "Data Export", description: "Download your data", keywords: ["export", "download", "backup"] },
  { section: "data", path: "/dashboard/settings/data-management", title: "Data Import", description: "Import data from other tools", keywords: ["import", "upload", "migrate"] },
  { section: "data", path: "/dashboard/settings/data-management", title: "Backup & Recovery", description: "Manage backups and restore points", keywords: ["backup", "recovery", "restore", "data protection"] },
  { section: "data", path: "/dashboard/settings/data-management", title: "Storage Management", description: "View and manage storage usage", keywords: ["storage", "usage", "space", "quota"] },
  
  // API Access
  { section: "api", path: "/dashboard/settings/api", title: "API Keys", description: "Manage API access tokens", keywords: ["api", "keys", "tokens", "access"] },
  { section: "api", path: "/dashboard/settings/api", title: "Webhooks", description: "Configure webhook endpoints", keywords: ["webhooks", "endpoints", "callbacks"] },
  
  // Billing
  { section: "billing", path: "/dashboard/settings/billing", title: "Subscription", description: "Manage your plan and billing", keywords: ["billing", "subscription", "plan", "payment"] },
  { section: "billing", path: "/dashboard/settings/billing", title: "Payment Methods", description: "Update payment information", keywords: ["payment", "credit card", "billing"] },
];

const SearchIcon = Search as React.FC<{ className?: string }>;
const ClockIcon = Clock as React.FC<{ className?: string }>;
const CommandIcon = Command as React.FC<{ className?: string }>;
const ChevronRightIcon = ChevronRight as React.FC<{ className?: string }>;

export function SettingsSearch() {
  const { searchQuery, setSearchQuery, recentlyViewed } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show recently viewed when no search query
      return recentlyViewed.map(section => {
        const setting = searchableSettings.find(s => s.section === section);
        return setting || searchableSettings.find(s => s.section === "profile")!;
      }).slice(0, 3);
    }

    return searchableSettings.filter(setting => {
      const query = searchQuery.toLowerCase();
      return (
        setting.title.toLowerCase().includes(query) ||
        setting.description.toLowerCase().includes(query) ||
        setting.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    }).slice(0, 8);
  }, [searchQuery, recentlyViewed]);

  const handleSelect = (setting: typeof searchableSettings[0]) => {
    navigate({ to: setting.path });
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery("");
        break;
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          placeholder="Search settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-16"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-xs text-zinc-500 dark:text-zinc-400">
            <CommandIcon className="w-3 h-3" />
            K
          </kbd>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && filteredResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {!searchQuery.trim() && recentlyViewed.length > 0 && (
              <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <ClockIcon className="w-3 h-3" />
                  Recently viewed
                </div>
              </div>
            )}
            
            <div className="py-2">
              {filteredResults.map((setting, index) => {
                const IconComponent = sectionIcons[setting.section as keyof typeof sectionIcons];
                return (
                  <button
                    key={`${setting.section}-${setting.title}`}
                    onClick={() => handleSelect(setting)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors",
                      index === selectedIndex && "bg-zinc-50 dark:bg-zinc-800"
                    )}
                  >
                    <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                      <IconComponent className="w-3 h-3 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                        {setting.title}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {setting.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {setting.section}
                      </Badge>
                      <ChevronRightIcon className="w-3 h-3 text-zinc-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 