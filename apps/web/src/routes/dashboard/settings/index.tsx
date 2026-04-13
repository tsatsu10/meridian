import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { 
  User, 
  Palette, 
  Shield, 
  Bell, 
  Code, 
  CreditCard, 
  Database, 
  Puzzle, 
  Users,
  ArrowRight,
  Sparkles,
  Building2,
  Zap,
  Calendar,
  FileText,
  HardDrive,
  Package,
  Mail,
  Languages,
  Keyboard,
  Filter
} from 'lucide-react'
import LazyDashboardLayout from '@/components/performance/lazy-dashboard-layout'
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/settings/')({
  component: withErrorBoundary(SettingsIndex, "Settings")
})

const settingsCategories = [
  // 📱 Personal Settings (6)
  {
    id: 'profile',
    title: 'Profile',
    description: 'Manage your personal information and profile details',
    icon: User,
    color: 'from-blue-500 to-cyan-500',
    href: '/dashboard/settings/profile',
    category: 'personal'
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize your theme and display preferences',
    icon: Palette,
    color: 'from-purple-500 to-pink-500',
    href: '/dashboard/settings/appearance',
    category: 'personal'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Control when and how you receive notifications',
    icon: Bell,
    color: 'from-yellow-500 to-orange-500',
    href: '/dashboard/settings/notifications',
    category: 'personal'
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Customize shortcuts to match your workflow',
    icon: Keyboard,
    color: 'from-violet-500 to-purple-500',
    href: '/dashboard/settings/shortcuts',
    category: 'personal'
  },
  {
    id: 'templates',
    title: 'Dashboard Templates',
    description: 'Create and manage custom dashboard layouts',
    icon: Package,
    color: 'from-indigo-500 to-blue-500',
    href: '/dashboard/settings/templates',
    category: 'personal'
  },
  // 🔒 Security & Privacy (3)
  {
    id: 'security',
    title: 'Security',
    description: 'Authentication, passwords, and security settings',
    icon: Shield,
    color: 'from-green-500 to-emerald-500',
    href: '/dashboard/settings/security',
    category: 'security'
  },
  {
    id: 'api',
    title: 'API & Webhooks',
    description: 'Manage API keys, webhooks, and integrations',
    icon: Code,
    color: 'from-indigo-500 to-blue-500',
    href: '/dashboard/settings/api',
    category: 'security'
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs',
    description: 'Activity tracking, compliance, and security monitoring',
    icon: FileText,
    color: 'from-slate-500 to-gray-500',
    href: '/dashboard/settings/audit-logs',
    category: 'security'
  },
  
  // 🏢 Workspace Settings (4)
  {
    id: 'workspace',
    title: 'Workspace',
    description: 'Configure workspace information, features, and preferences',
    icon: Building2,
    color: 'from-blue-600 to-indigo-600',
    href: '/dashboard/settings/workspace',
    category: 'workspace'
  },
  {
    id: 'team',
    title: 'Team Management',
    description: 'Manage team members, invites, and collaboration',
    icon: Users,
    color: 'from-slate-500 to-zinc-500',
    href: '/dashboard/settings/team-management',
    category: 'workspace'
  },
  {
    id: 'roles',
    title: 'Roles & Permissions',
    description: 'Configure roles, permissions, and access control',
    icon: Shield,
    color: 'from-purple-600 to-pink-600',
    href: '/dashboard/settings/roles-unified',
    category: 'workspace'
  },
  {
    id: 'billing',
    title: 'Billing & Plans',
    description: 'Subscription, payments, and billing history',
    icon: CreditCard,
    color: 'from-emerald-500 to-teal-500',
    href: '/dashboard/settings/billing',
    category: 'workspace'
  },
  
  // 💾 Data & Integration (5)
  {
    id: 'data-management',
    title: 'Data Management',
    description: 'Backup, import, export, and storage management',
    icon: Database,
    color: 'from-cyan-500 to-blue-500',
    href: '/dashboard/settings/data-management',
    category: 'data'
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect with external services and tools',
    icon: Puzzle,
    color: 'from-pink-500 to-rose-500',
    href: '/dashboard/settings/integrations',
    category: 'data'
  },
  {
    id: 'automation',
    title: 'Automation',
    description: 'Workflow automation, rules, and execution settings',
    icon: Zap,
    color: 'from-amber-500 to-orange-500',
    href: '/dashboard/settings/automation',
    category: 'data'
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Calendar sync, events, and scheduling preferences',
    icon: Calendar,
    color: 'from-teal-500 to-cyan-500',
    href: '/dashboard/settings/calendar',
    category: 'data'
  },
  {
    id: 'filters',
    title: 'Advanced Filters',
    description: 'Create, save, and manage custom filters',
    icon: Filter,
    color: 'from-cyan-500 to-teal-500',
    href: '/dashboard/settings/filters',
    category: 'data'
  },
  
  // 🎨 Customization & Advanced (4)
  {
    id: 'email',
    title: 'Email & SMTP',
    description: 'SMTP configuration, email digests, and messaging settings',
    icon: Mail,
    color: 'from-red-500 to-pink-500',
    href: '/dashboard/settings/email',
    category: 'customization'
  },
  {
    id: 'themes',
    title: 'Themes & Branding',
    description: 'Custom themes, color palettes, and workspace branding',
    icon: Palette,
    color: 'from-pink-500 to-rose-500',
    href: '/dashboard/settings/themes',
    category: 'customization'
  },
  {
    id: 'localization',
    title: 'Language & Localization',
    description: 'Languages, translations, and regional preferences',
    icon: Languages,
    color: 'from-blue-500 to-indigo-500',
    href: '/dashboard/settings/localization',
    category: 'customization'
  },
]

function SettingsIndex() {
  return (
    <LazyDashboardLayout>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-slate-950 dark:via-blue-950/50 dark:to-indigo-950 overflow-y-auto">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-slate-200 dark:bg-grid-slate-800 opacity-20"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        
        <div className="relative p-4 md:p-6 lg:p-8 max-w-7xl mx-auto pb-16">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-full border border-white/20 dark:border-slate-700/20">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Settings Dashboard</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-slate-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-4">
              Customize Your Experience
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Fine-tune your workspace to match your preferences and workflow. Every setting is designed to enhance your productivity.
            </p>
          </motion.div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settingsCategories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ 
                  scale: 1.02,
                  translateY: -4
                }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to={category.href}
                  className="group relative overflow-hidden rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-white/20 dark:border-slate-700/20 p-6 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-300 block"
                >
                  {/* Gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                  
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <category.icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Content */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {category.title}
                      </h3>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {category.description}
                    </p>
                  </div>

                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-16 p-6 bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-slate-700/20"
          >
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Need help configuring something? Check out our{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                documentation
              </a>{' '}
              or{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                contact support
              </a>
              .
            </p>
          </motion.div>
        </div>
      </div>
    </LazyDashboardLayout>
  )
} 