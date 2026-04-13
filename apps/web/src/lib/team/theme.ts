// Unified Team Management Theme
// Consistent styling, animations, and design patterns

import { type Variants } from 'framer-motion';

// Animation variants for consistent motion design
export const teamAnimations = {
  // Container animations
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  } as Variants,

  // Item animations
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  } as Variants,

  // Card animations
  card: {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    },
    hover: {
      scale: 1.02,
      y: -2,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 20
      }
    },
    tap: {
      scale: 0.98
    }
  } as Variants,

  // Button animations
  button: {
    hover: {
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 20
      }
    },
    tap: {
      scale: 0.95
    }
  } as Variants,

  // Navigation animations
  navigation: {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  } as Variants,

  // Stats widget animations
  stats: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  } as Variants,

  // Slide animations
  slideIn: {
    hidden: { opacity: 0, x: 100 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    },
    exit: {
      opacity: 0,
      x: -100,
      transition: {
        duration: 0.2
      }
    }
  } as Variants,

  // Fade animations
  fade: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  } as Variants
};

// Color theme for team management
export const teamColors = {
  // Primary brand colors
  primary: {
    emerald: {
      50: '#ecfdf5',
      100: '#d1fae5',
      500: '#10b981',
      600: '#059669',
      700: '#047857'
    },
    teal: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e'
    }
  },

  // Role-specific colors
  roles: {
    'workspace-manager': {
      gradient: 'from-yellow-500 to-orange-500',
      text: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200'
    },
    'department-head': {
      gradient: 'from-blue-500 to-indigo-500',
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200'
    },
    'project-manager': {
      gradient: 'from-purple-500 to-pink-500',
      text: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200'
    },
    'team-lead': {
      gradient: 'from-green-500 to-emerald-500',
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200'
    },
    'member': {
      gradient: 'from-green-500 to-emerald-500',
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200'
    },
    'client': {
      gradient: 'from-blue-400 to-blue-600',
      text: 'text-blue-500',
      bg: 'bg-blue-50',
      border: 'border-blue-200'
    },
    'contractor': {
      gradient: 'from-orange-500 to-red-500',
      text: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200'
    },
    'stakeholder': {
      gradient: 'from-purple-400 to-purple-600',
      text: 'text-purple-500',
      bg: 'bg-purple-50',
      border: 'border-purple-200'
    },
    'workspace-viewer': {
      gradient: 'from-gray-500 to-slate-500',
      text: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200'
    },
    'project-viewer': {
      gradient: 'from-gray-500 to-slate-500',
      text: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200'
    },
    'guest': {
      gradient: 'from-gray-400 to-gray-600',
      text: 'text-gray-500',
      bg: 'bg-gray-50',
      border: 'border-gray-200'
    }
  },

  // Status colors
  status: {
    active: {
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-500'
    },
    pending: {
      text: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-500'
    },
    inactive: {
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500'
    },
    offline: {
      text: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: 'text-gray-400'
    }
  },

  // Performance indicator colors
  performance: {
    excellent: {
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200'
    },
    good: {
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200'
    },
    average: {
      text: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200'
    },
    poor: {
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200'
    }
  }
};

// Component styling presets
export const teamStyles = {
  // Container styles
  containers: {
    page: "min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/50 dark:from-slate-950 dark:via-emerald-950/30 dark:to-teal-950/50",
    section: "bg-white border border-gray-200 shadow-sm rounded-2xl p-6",
    card: "bg-white rounded-xl border border-gray-200 shadow-sm",
    backdrop: "absolute inset-0 bg-grid-slate-200 dark:bg-grid-slate-800 opacity-20"
  },

  // Header styles
  headers: {
    page: {
      title: "text-3xl font-bold bg-gradient-to-r from-slate-900 to-teal-900 dark:from-slate-100 dark:to-teal-100 bg-clip-text text-transparent",
      subtitle: "text-gray-500",
      icon: "p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl"
    },
    section: {
      title: "text-lg font-semibold text-slate-900 dark:text-slate-100",
      subtitle: "text-sm text-gray-500",
      icon: "p-2 rounded-lg"
    }
  },

  // Button styles
  buttons: {
    primary: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white",
    secondary: "border-emerald-200 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:bg-emerald-900/20",
    ghost: "text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20",
    outline: "bg-white border-white/20 dark:border-slate-700/20 hover:bg-gray-50"
  },

  // Input styles
  inputs: {
    default: "bg-white border-white/20 dark:border-slate-700/20",
    search: "max-w-md bg-white border-white/20 dark:border-slate-700/20"
  },

  // Avatar styles
  avatars: {
    default: "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800",
    small: "h-10 w-10",
    medium: "h-12 w-12",
    large: "h-16 w-16"
  },

  // Badge styles
  badges: {
    role: "bg-gradient-to-r text-white border-0",
    status: "text-xs font-medium px-2 py-1 rounded-md",
    count: "text-xs ml-1 bg-white/20 text-white border-white/20"
  }
};

// Layout patterns
export const teamLayouts = {
  // Grid layouts
  grids: {
    stats: "grid grid-cols-1 md:grid-cols-4 gap-4",
    members: "space-y-4",
    roles: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
    navigation: "flex gap-2 flex-wrap"
  },

  // Flexbox layouts
  flex: {
    header: "flex items-center justify-between",
    actions: "flex items-center gap-3",
    memberRow: "flex items-center justify-between",
    memberInfo: "flex items-center gap-4",
    roleDisplay: "flex items-center gap-1 justify-end"
  },

  // Spacing
  spacing: {
    page: "p-4 md:p-6 lg:p-8 max-w-6xl mx-auto",
    section: "space-y-6",
    item: "space-y-4",
    tight: "space-y-2"
  }
};

// Responsive breakpoints
export const teamBreakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Common utility functions
export const teamUtils = {
  // Get performance color based on score
  getPerformanceColor: (score: number) => {
    if (score >= 90) return teamColors.performance.excellent;
    if (score >= 75) return teamColors.performance.good;
    if (score >= 60) return teamColors.performance.average;
    return teamColors.performance.poor;
  },

  // Get workload color based on load
  getWorkloadColor: (load: number) => {
    if (load >= 90) return teamColors.status.inactive; // Overloaded
    if (load >= 75) return teamColors.performance.average; // High load
    if (load >= 50) return teamColors.performance.good; // Moderate load
    return teamColors.performance.excellent; // Light load
  },

  // Get role colors
  getRoleColors: (role: string) => {
    return teamColors.roles[role as keyof typeof teamColors.roles] || teamColors.roles.guest;
  },

  // Get status colors
  getStatusColors: (status: string) => {
    return teamColors.status[status as keyof typeof teamColors.status] || teamColors.status.offline;
  },

  // Generate consistent class names
  cx: (...classes: (string | undefined | null | false)[]) => {
    return classes.filter(Boolean).join(' ');
  }
};

// Theme configuration
export const teamTheme = {
  animations: teamAnimations,
  colors: teamColors,
  styles: teamStyles,
  layouts: teamLayouts,
  breakpoints: teamBreakpoints,
  utils: teamUtils
};

export default teamTheme;