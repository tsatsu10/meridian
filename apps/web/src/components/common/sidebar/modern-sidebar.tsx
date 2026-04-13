"use client";

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight,
  Menu,
  X,
  Home,
  FolderOpen,
  Users,
  BarChart3,
  Settings,
  Bell,
  Search,
  Plus,
  LogOut,
  HelpCircle,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/cn';

// Types
interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string | number;
  children?: SidebarItem[];
  isActive?: boolean;
  onClick?: () => void;
}

interface SidebarSection {
  id: string;
  title?: string;
  items: SidebarItem[];
}

interface ModernSidebarProps {
  sections: SidebarSection[];
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  userAvatar?: string;
  userName?: string;
  userEmail?: string;
}

// Enhanced Tooltip Component
const Tooltip: React.FC<{
  content: string;
  children: React.ReactNode;
  position?: 'left' | 'right' | 'top' | 'bottom';
  delay?: number;
}> = ({ content, children, position = 'right', delay = 150 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const childRef = useRef<HTMLDivElement>(null);

  const showTooltip = (e: React.MouseEvent) => {
    if (childRef.current) {
      const rect = childRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 500, damping: 30, duration: 0.15 } }
  };

  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = { position: 'absolute', zIndex: 1000 };
  if (coords) {
    if (position === 'right') {
      tooltipStyle.left = coords.left + 48; // icon width + margin
      tooltipStyle.top = coords.top + 20;
      tooltipStyle.transform = 'translateY(-50%)';
    } else if (position === 'left') {
      tooltipStyle.left = coords.left - 8;
      tooltipStyle.top = coords.top + 20;
      tooltipStyle.transform = 'translate(-100%,-50%)';
    } else if (position === 'top') {
      tooltipStyle.left = coords.left + 24;
      tooltipStyle.top = coords.top - 8;
      tooltipStyle.transform = 'translateX(-50%) translateY(-100%)';
    } else if (position === 'bottom') {
      tooltipStyle.left = coords.left + 24;
      tooltipStyle.top = coords.top + 48;
      tooltipStyle.transform = 'translateX(-50%)';
    }
  }

  return (
    <div
      ref={childRef}
      className="relative"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      style={{ display: 'inline-block' }}
    >
      {children}
      {isVisible && coords && ReactDOM.createPortal(
        <motion.div
          variants={tooltipVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          style={tooltipStyle}
          className={cn(
            "px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-xl border border-gray-600 whitespace-nowrap pointer-events-none backdrop-blur-sm"
          )}
        >
          {content}
        </motion.div>,
        document.body
      )}
    </div>
  );
};

// Navigation Item Component
const NavigationItem: React.FC<{
  item: SidebarItem;
  isOpen: boolean;
  level?: number;
  onItemClick: (item: SidebarItem) => void;
}> = ({ item, isOpen, level = 0, onItemClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const IconComponent = item.icon as React.ComponentType<{ className?: string }>;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onItemClick(item);
  };

  const content = (
    <button
      className={cn(
        "group relative w-full flex items-center rounded-xl",
        "transition-all duration-200 ease-out",
        "hover:bg-white/10 hover:shadow-lg hover:shadow-black/5",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10",
        "active:scale-[0.98] active:transition-transform active:duration-75",
        isOpen ? "gap-3 px-3 py-2.5" : "justify-center p-3 w-full min-h-[3rem]",
        level > 0 && isOpen && "ml-6 py-2",
        item.isActive && [
          "bg-gradient-to-r from-blue-500/20 to-purple-500/20",
          "border border-blue-500/30",
          "shadow-lg shadow-blue-500/10",
          "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
          "before:bg-gradient-to-b before:from-blue-400 before:to-purple-500",
          "before:rounded-r-full"
        ]
      )}
      onClick={handleClick}
      aria-expanded={hasChildren ? isExpanded : undefined}
      role={hasChildren ? "button" : "menuitem"}
      tabIndex={0}
    >
      {/* Icon */}
      <div className={cn(
        "relative flex items-center justify-center",
        "w-5 h-5",
        item.isActive ? "text-blue-400" : "text-gray-400"
      )}>
        <IconComponent className={cn(
          "w-5 h-5",
          "group-hover:scale-110 group-active:scale-95",
          "transition-all duration-200",
          item.isActive ? "text-blue-400" : "text-gray-400"
        )} />

        {/* Active Indicator Dot */}
        {item.isActive && (
          <div className="absolute -right-1 -top-1 w-2 h-2 bg-blue-400 rounded-full" />
        )}
      </div>

      {/* Label and Badge */}
      {isOpen && (
        <div className="flex items-center justify-between flex-1 min-w-0">
          <span className={cn(
            "text-sm font-medium truncate",
            "transition-colors duration-200",
            item.isActive ? "text-white" : "text-gray-300",
            "group-hover:text-white"
          )}>
            {item.label}
          </span>

          {/* Badge */}
          {item.badge && (
            <span className={cn(
              "px-2 py-0.5 text-xs font-semibold rounded-full",
              "bg-red-500 text-white min-w-[1.25rem] text-center",
              "shadow-lg"
            )}>
              {item.badge}
            </span>
          )}

          {/* Expand/Collapse Icon */}
          {hasChildren && (
            <div className="ml-2">
              {React.createElement(ChevronRight as React.ComponentType<{ className?: string }>, {
                className: cn(
                  "w-4 h-4 text-gray-400 transition-transform duration-200",
                  isExpanded && "rotate-90"
                )
              })}
            </div>
          )}
        </div>
      )}
    </button>
  );

  // Always render with tooltip when closed, without when open
  if (!isOpen) {
    return (
      <Tooltip content={item.label}>
        <div className="w-full">
          {content}
        </div>
      </Tooltip>
    );
  }

  return (
    <div>
      {content}

      {/* Children */}
      {isOpen && hasChildren && isExpanded && (
        <div className="overflow-hidden">
          <div className="space-y-1 py-1">
            {item.children?.map((child) => (
              <NavigationItem
                key={child.id}
                item={child}
                isOpen={isOpen}
                level={level + 1}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Sidebar Component
export const ModernSidebar: React.FC<ModernSidebarProps> = ({
  sections,
  isOpen,
  onToggle,
  className,
  userAvatar,
  userName = "John Doe",
  userEmail = "john@company.com"
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle item clicks
  const handleItemClick = (item: SidebarItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      // Handle navigation
    }

    // Close sidebar on mobile after selection
    if (isMobile && isOpen) {
      onToggle();
    }
  };

  // Sidebar animation variants
  const sidebarVariants = {
    closed: {
      width: isMobile ? 0 : "5rem",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    open: {
      width: isMobile ? "100vw" : "16rem",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  };

  const overlayVariants = {
    closed: { opacity: 0, pointerEvents: "none" as const },
    open: { opacity: 1, pointerEvents: "auto" as const }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <AnimatePresence>
          <motion.div
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onToggle}
          />
        </AnimatePresence>
      )}

      {/* Sidebar */}
      <motion.aside
        variants={sidebarVariants}
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        className={cn(
          "flex-shrink-0 h-full relative",
          "bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800",
          "border-r border-gray-800/50",
          "shadow-2xl shadow-black/25",
          "backdrop-blur-xl",
          isMobile && isOpen && "fixed left-0 top-0 z-50",
          className
        )}
        style={{
          background: "linear-gradient(135deg, #1f2937 0%, #111827 50%, #0f172a 100%)"
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "flex items-center gap-3 p-4 border-b border-gray-800/50",
            !isOpen && "justify-center"
          )}>
            {/* Toggle Button */}
            <button
              onClick={onToggle}
              className={cn(
                "p-2 rounded-xl transition-all duration-200",
                "hover:bg-white/10 hover:shadow-lg",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                "active:scale-95"
              )}
              aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
            >
              <motion.div
                animate={{ rotate: isOpen ? 0 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isOpen ? (
                  React.createElement(X as React.ComponentType<{ className?: string }>, {
                    className: "w-5 h-5 text-gray-400"
                  })
                ) : (
                  React.createElement(Menu as React.ComponentType<{ className?: string }>, {
                    className: "w-5 h-5 text-gray-400"
                  })
                )}
              </motion.div>
            </button>

            {/* Logo/Brand */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">K</span>
                  </div>
                  <div>
                    <h1 className="text-white font-semibold text-lg">Meridian</h1>
                    <p className="text-gray-400 text-xs">Project Hub</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: 0.15 }}
                className="p-4"
              >
                <div className="relative">
                  {React.createElement(Search as React.ComponentType<{ className?: string }>, {
                    className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  })}
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 rounded-xl",
                      "bg-gray-800/50 border border-gray-700/50",
                      "text-white placeholder-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                      "focus:border-blue-500/50",
                      "transition-all duration-200"
                    )}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 overflow-y-auto pb-4",
            isOpen ? "px-4" : "px-1"
          )}>
            <div className={cn(
              isOpen ? "space-y-6" : "space-y-1"
            )}>
              {sections.map((section, sectionIndex) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sectionIndex * 0.1 }}
                >
                  {/* Section Title */}
                  <AnimatePresence>
                    {isOpen && section.title && (
                      <motion.h3
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3"
                      >
                        {section.title}
                      </motion.h3>
                    )}
                  </AnimatePresence>

                  {/* Section Items */}
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <NavigationItem
                        key={item.id}
                        item={item}
                        isOpen={isOpen}
                        onItemClick={handleItemClick}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </nav>

          {/* User Profile */}
          <div className={cn(
            "p-4 border-t border-gray-800/50",
            !isOpen && "px-2"
          )}>
            <motion.div
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl",
                "hover:bg-white/5 transition-all duration-200",
                "cursor-pointer group",
                !isOpen && "justify-center"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-white font-semibold text-sm">
                      {userName.charAt(0)}
                    </span>
                  )}
                </div>
                {/* Online Status */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
              </div>

              {/* User Info */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-white font-medium text-sm truncate">{userName}</p>
                    <p className="text-gray-400 text-xs truncate">{userEmail}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User Action Icon */}
              {!isOpen ? (
                <Tooltip content="Profile">
                  <div className="w-4 h-4" />
                </Tooltip>
              ) : (
                React.createElement(LogOut as React.ComponentType<{ className?: string }>, {
                  className: "w-4 h-4 text-gray-400 group-hover:text-white transition-colors"
                })
              )}
            </motion.div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}; 