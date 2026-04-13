import { Button } from "./ui/button";
import { AlertTriangle, Info, CheckCircle, X } from "lucide-react";
import { useState } from "react";

interface SystemAlertProps {
  type?: "info" | "warning" | "success" | "error";
  title?: string;
  message: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "destructive";
  }>;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function SystemAlert({ 
  type = "info", 
  title,
  message, 
  actions = [],
  dismissible = true,
  onDismiss 
}: SystemAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "error":
        return <AlertTriangle className="h-4 w-4" />;
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "warning":
        return "bg-amber-500/10 border-amber-500/20";
      case "error":
        return "bg-red-500/10 border-red-500/20";
      case "success":
        return "bg-green-500/10 border-green-500/20";
      default:
        return "bg-blue-500/10 border-blue-500/20";
    }
  };

  const getTextColor = () => {
    switch (type) {
      case "warning":
        return "text-amber-900 dark:text-amber-300";
      case "error":
        return "text-red-900 dark:text-red-300";
      case "success":
        return "text-green-900 dark:text-green-300";
      default:
        return "text-blue-900 dark:text-blue-300";
    }
  };

  const getIconColor = () => {
    switch (type) {
      case "warning":
        return "text-amber-600";
      case "error":
        return "text-red-600";
      case "success":
        return "text-green-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className={`flex sticky top-0 left-0 right-0 flex-col border-b px-4 py-3 ${getBgColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={getIconColor()}>
            {getIcon()}
          </div>
          <div className="flex flex-col gap-1">
            {title && (
              <div className={`font-medium text-sm ${getTextColor()}`}>
                {title}
              </div>
            )}
            <div className={`text-sm ${getTextColor()}`}>
              {message}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              variant={action.variant || "outline"}
              size="sm"
              className={`text-xs h-7 px-3 ${
                type === "warning" 
                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-500/30"
                  : type === "error"
                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-900 dark:text-red-300 border-red-500/30"
                  : type === "success"
                  ? "bg-green-500/10 hover:bg-green-500/20 text-green-900 dark:text-green-300 border-green-500/30"
                  : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-500/30"
              }`}
            >
              {action.label}
            </Button>
          ))}
          
          {dismissible && (
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 hover:bg-white/20 ${getTextColor()}`}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
