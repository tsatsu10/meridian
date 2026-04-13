import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HelpCircle, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb,
  ExternalLink,
  X
} from "lucide-react";
import { cn } from "@/lib/cn";

// Icon wrappers
const HelpCircleIcon = HelpCircle as React.FC<{ className?: string }>;
const InfoIcon = Info as React.FC<{ className?: string }>;
const AlertTriangleIcon = AlertTriangle as React.FC<{ className?: string }>;
const CheckCircleIcon = CheckCircle as React.FC<{ className?: string }>;
const LightbulbIcon = Lightbulb as React.FC<{ className?: string }>;
const ExternalLinkIcon = ExternalLink as React.FC<{ className?: string }>;
const XIcon = X as React.FC<{ className?: string }>;

export interface HelpContent {
  title: string;
  description: string;
  type?: "info" | "warning" | "success" | "tip";
  details?: string;
  links?: Array<{
    label: string;
    url: string;
  }>;
  examples?: Array<{
    title: string;
    description: string;
  }>;
}

interface ContextualHelpProps {
  content: HelpContent;
  trigger?: "hover" | "click";
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  children?: ReactNode;
}

export function ContextualHelp({ 
  content, 
  trigger = "hover", 
  position = "top",
  className,
  children 
}: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = () => {
    switch (content.type) {
      case "warning":
        return <AlertTriangleIcon className="w-4 h-4 text-amber-500" />;
      case "success":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "tip":
        return <LightbulbIcon className="w-4 h-4 text-blue-500" />;
      default:
        return <InfoIcon className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case "bottom":
        return "top-full mt-2 left-1/2 transform -translate-x-1/2";
      case "left":
        return "right-full mr-2 top-1/2 transform -translate-y-1/2";
      case "right":
        return "left-full ml-2 top-1/2 transform -translate-y-1/2";
      default: // top
        return "bottom-full mb-2 left-1/2 transform -translate-x-1/2";
    }
  };

  const handleTrigger = () => {
    if (trigger === "click") {
      setIsOpen(!isOpen);
    }
  };

  const handleMouseEnter = () => {
    if (trigger === "hover") {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === "hover") {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <div
        className="cursor-help"
        onClick={handleTrigger}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children || <HelpCircleIcon className="w-4 h-4 text-zinc-400 hover:text-zinc-600 transition-colors" />}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === "top" ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: position === "top" ? 10 : -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 w-80 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg",
              getPositionClasses()
            )}
          >
            {/* Close button for click trigger */}
            {trigger === "click" && (
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}

            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start gap-3 pr-6">
                {getIcon()}
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                    {content.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {content.description}
                  </p>
                </div>
              </div>

              {/* Details */}
              {content.details && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {content.details}
                </div>
              )}

              {/* Examples */}
              {content.examples && content.examples.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Examples:
                  </h4>
                  {content.examples.map((example, index) => (
                    <div key={index} className="text-xs">
                      <div className="font-medium text-zinc-600 dark:text-zinc-400">
                        {example.title}
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-500">
                        {example.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Links */}
              {content.links && content.links.length > 0 && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="space-y-1">
                    {content.links.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        {link.label}
                        <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Arrow */}
            <div
              className={cn(
                "absolute w-2 h-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 transform rotate-45",
                position === "top" && "top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-r border-b",
                position === "bottom" && "bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-l border-t",
                position === "left" && "left-full top-1/2 -translate-x-1/2 -translate-y-1/2 border-r border-t",
                position === "right" && "right-full top-1/2 translate-x-1/2 -translate-y-1/2 border-l border-b"
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Predefined help content for common settings
export const HELP_CONTENT = {
  theme: {
    title: "Theme Selection",
    description: "Choose your preferred color scheme for the interface",
    type: "info" as const,
    details: "The system theme automatically switches between light and dark modes based on your operating system settings. This helps reduce eye strain and saves battery on OLED screens.",
    examples: [
      {
        title: "Light Theme",
        description: "Best for well-lit environments and daytime work"
      },
      {
        title: "Dark Theme", 
        description: "Reduces eye strain in low-light conditions"
      },
      {
        title: "System",
        description: "Automatically matches your device's appearance settings"
      }
    ]
  },
  
  twoFactor: {
    title: "Two-Factor Authentication",
    description: "Add an extra layer of security to your account",
    type: "warning" as const,
    details: "2FA requires both your password and a verification code from your phone to access your account. This significantly reduces the risk of unauthorized access, even if your password is compromised.",
    links: [
      {
        label: "Learn more about 2FA security",
        url: "https://example.com/2fa-guide"
      }
    ],
    examples: [
      {
        title: "Authenticator App",
        description: "Use apps like Google Authenticator or Authy to generate codes"
      },
      {
        title: "SMS Backup",
        description: "Receive backup codes via text message when needed"
      }
    ]
  },

  notifications: {
    title: "Notification Settings",
    description: "Control how and when you receive updates",
    type: "tip" as const,
    details: "Fine-tune your notification preferences to stay informed without being overwhelmed. Different notification types serve different purposes in your workflow.",
    examples: [
      {
        title: "Task Assigned",
        description: "Get notified when someone assigns you a new task"
      },
      {
        title: "Project Updates",
        description: "Stay informed about important project milestones"
      },
      {
        title: "Direct Messages",
        description: "Receive alerts for personal communications"
      }
    ]
  },

  dataExport: {
    title: "Data Export",
    description: "Download your data for backup or migration",
    type: "info" as const,
    details: "You can export your data in various formats. Full exports include all your data, while filtered exports let you choose specific types of information.",
    examples: [
      {
        title: "Full Export",
        description: "Complete backup of all your projects, tasks, and settings"
      },
      {
        title: "Projects Only",
        description: "Just your project data and related tasks"
      },
      {
        title: "Personal Data",
        description: "Your profile information and personal settings"
      }
    ]
  },

  apiAccess: {
    title: "API Access",
    description: "Manage programmatic access to your account",
    type: "warning" as const,
    details: "API keys provide programmatic access to your account data. Keep them secure and only share them with trusted applications. You can revoke access at any time.",
    links: [
      {
        label: "API Documentation",
        url: "https://example.com/api-docs"
      },
      {
        label: "Security Best Practices",
        url: "https://example.com/api-security"
      }
    ]
  },

  privacy: {
    title: "Privacy Settings",
    description: "Control how your information is used and shared",
    type: "info" as const,
    details: "These settings control the visibility of your profile and activity data. You can adjust them based on your comfort level and team collaboration needs.",
    examples: [
      {
        title: "Public Profile",
        description: "Your profile is visible to all team members"
      },
      {
        title: "Activity Tracking",
        description: "Allow the system to track your usage for analytics"
      },
      {
        title: "Online Status",
        description: "Show when you're actively using the platform"
      }
    ]
  }
};

// Quick help tooltip component
interface HelpTooltipProps {
  content: string;
  children?: ReactNode;
  className?: string;
}

export function HelpTooltip({ content, children, className }: HelpTooltipProps) {
  return (
    <ContextualHelp
      content={{
        title: "Help",
        description: content,
        type: "info"
      }}
      trigger="hover"
      className={className}
    >
      {children}
    </ContextualHelp>
  );
} 