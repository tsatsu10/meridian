import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useTheme from '@/components/providers/theme-provider/hooks/use-theme';
import { MeridianMark } from '@/components/branding/meridian-mark';
import { 
  CheckCircle, 
  ArrowRight, 
  Star, 
  Users, 
  Shield, 
  Zap,
  Calendar,
  MessageSquare,
  BarChart3,
  FileText,
  Kanban,
  Menu,
  X,
  Play,
  UserPlus,
  TrendingUp,
  ChevronDown,
  HelpCircle,
  Sparkles,
  Rocket,
  Github,
  Twitter,
  Linkedin,
  Video,
  Clock,
  Target,
  Workflow,
  Brain,
  Lock,
  Layers,
  GitBranch,
  Code,
  Briefcase,
  Crown,
  UserCog,
  CheckSquare,
  Activity,
  PieChart,
  Database,
  Cloud
} from 'lucide-react';

// User Personas/Roles
const userRoles = [
  {
    id: 'workspace-manager',
    name: 'Workspace Manager',
    icon: Crown,
    level: 7,
    description: 'Full workspace control, billing, system management',
    color: 'from-purple-500 to-pink-500',
    features: ['Complete System Access', 'Billing Management', 'Global Analytics', 'User Administration']
  },
  {
    id: 'department-head',
    name: 'Department Head',
    icon: Briefcase,
    level: 6,
    description: 'Multi-project oversight, department analytics',
    color: 'from-blue-500 to-purple-500',
    features: ['Department Analytics', 'Cross-Project View', 'Budget Tracking', 'Resource Planning']
  },
  {
    id: 'project-manager',
    name: 'Project Manager',
    icon: Target,
    level: 4,
    description: 'Project lifecycle management, team coordination',
    color: 'from-green-500 to-blue-500',
    features: ['Project Planning', 'Gantt Charts', 'Team Assignment', 'Timeline Management']
  },
  {
    id: 'team-lead',
    name: 'Team Lead',
    icon: Users,
    level: 2,
    description: 'Task assignment, subtask management, team coordination',
    color: 'from-orange-500 to-red-500',
    features: ['Task Assignment', 'Workload Balancing', 'Sprint Planning', 'Team Analytics']
  },
  {
    id: 'member',
    name: 'Team Member',
    icon: UserCog,
    level: 1,
    description: 'Task execution, collaboration, time tracking',
    color: 'from-cyan-500 to-blue-500',
    features: ['Task Management', 'Time Tracking', 'Real-time Chat', 'File Sharing']
  }
];

// Core Platform Features
const platformFeatures = [
  {
    category: 'Collaboration',
    icon: MessageSquare,
    color: 'from-blue-500 to-cyan-500',
    features: [
      { name: 'Real-time Chat', icon: MessageSquare, description: 'Instant messaging with threads and reactions' },
      { name: 'Video Conferencing', icon: Video, description: 'Built-in video calls and screen sharing' },
      { name: 'Live Presence', icon: Activity, description: 'See who\'s online and what they\'re working on' },
      { name: 'Collaborative Docs', icon: FileText, description: 'Real-time document editing' }
    ]
  },
  {
    category: 'Project Management',
    icon: Kanban,
    color: 'from-purple-500 to-pink-500',
    features: [
      { name: 'Smart Boards', icon: Kanban, description: 'Kanban, List, Timeline, and Calendar views' },
      { name: 'Task Dependencies', icon: GitBranch, description: 'Visualize and manage task relationships' },
      { name: 'Gantt Charts', icon: BarChart3, description: 'Advanced project timeline visualization' },
      { name: 'Milestones', icon: Target, description: 'Track key project achievements' }
    ]
  },
  {
    category: 'Analytics & Insights',
    icon: PieChart,
    color: 'from-green-500 to-emerald-500',
    features: [
      { name: 'Executive Dashboard', icon: TrendingUp, description: 'High-level portfolio insights' },
      { name: 'Team Analytics', icon: Users, description: 'Performance metrics and workload' },
      { name: 'Time Tracking', icon: Clock, description: 'Automated time logging and reports' },
      { name: 'Custom Reports', icon: BarChart3, description: 'Build your own analytics' }
    ]
  },
  {
    category: 'Automation & AI',
    icon: Brain,
    color: 'from-orange-500 to-red-500',
    features: [
      { name: 'Smart Workflows', icon: Workflow, description: 'Automate repetitive tasks' },
      { name: 'AI Insights', icon: Sparkles, description: 'Intelligent project recommendations' },
      { name: 'Auto-Assignment', icon: UserPlus, description: 'Smart task distribution' },
      { name: 'Recurring Tasks', icon: CheckSquare, description: 'Scheduled task automation' }
    ]
  }
];

// Tech Stack highlights
const techStack = [
  { name: 'React 18', icon: Code, color: 'text-blue-400' },
  { name: 'PostgreSQL', icon: Database, color: 'text-indigo-400' },
  { name: 'WebSocket', icon: Zap, color: 'text-yellow-400' },
  { name: 'Cloud-Native', icon: Cloud, color: 'text-purple-400' },
  { name: 'SOC 2', icon: Shield, color: 'text-green-400' },
  { name: 'Real-time', icon: Activity, color: 'text-red-400' }
];

const companyLogos = [
  'Microsoft', 'Google', 'Slack', 'Notion', 'Figma', 'Stripe'
];

const testimonials = [
  { 
    quote: "Meridian's role-based system is a game-changer. Each team member sees exactly what they need - nothing more, nothing less.", 
    author: "Sarah Chen", 
    role: "VP of Engineering", 
    company: "TechFlow",
    avatar: "SC",
    userRole: "Department Head"
  },
  { 
    quote: "Real-time collaboration is seamless. Our distributed team feels more connected than ever before.", 
    author: "Marcus Rodriguez", 
    role: "Project Manager", 
    company: "InnovateCorp",
    avatar: "MR",
    userRole: "Project Manager"
  },
  { 
    quote: "The analytics dashboards give me visibility into all projects at once. Perfect for executive oversight.", 
    author: "Emily Watson", 
    role: "CTO", 
    company: "CreativeStudio",
    avatar: "EW",
    userRole: "Workspace Manager"
  },
];

const stats = [
  { value: '50K+', label: 'Active Teams', icon: Users },
  { value: '99.9%', label: 'Uptime SLA', icon: TrendingUp },
  { value: '2M+', label: 'Tasks Completed', icon: CheckCircle },
  { value: '<100ms', label: 'Response Time', icon: Zap }
];

const faqData = [
  {
    question: 'How does role-based access control work?',
    answer: 'Meridian has 11 hierarchical roles from Workspace Manager (full control) to Guest (temporary access). Each role has specific permissions tailored to their responsibilities, ensuring team members see exactly what they need.'
  },
  {
    question: 'Is real-time collaboration truly instant?',
    answer: 'Yes! Using WebSocket technology, all changes are pushed to team members in real-time (<100ms latency). Chat, presence, task updates, and document edits sync instantly across all connected users.'
  },
  {
    question: 'Can I migrate from other tools?',
    answer: 'Absolutely! We provide migration tools for popular platforms like Asana, Trello, Jira, and Monday.com. Our team offers free migration assistance for Enterprise plans.'
  },
  {
    question: 'What kind of analytics do you provide?',
    answer: 'Executive dashboards, team performance metrics, time tracking, project health scores, burndown charts, velocity tracking, and custom report builders. All role-appropriate to your access level.'
  },
  {
    question: 'How secure is Meridian?',
    answer: 'Enterprise-grade security with SOC 2 compliance, end-to-end encryption, 2FA authentication, RBAC, audit logs, and regular security audits. Your data is hosted on secure cloud infrastructure.'
  },
  {
    question: 'Does it work offline?',
    answer: 'Yes! Meridian is a Progressive Web App (PWA) that works offline and syncs when you reconnect. Install it on desktop or mobile for a native app experience.'
  }
];

const pricingPlans = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    description: 'Perfect for small teams getting started',
    features: [
      'Up to 5 team members',
      'Unlimited projects',
      'Basic boards & calendar',
      'Community support',
      '5GB storage',
      'Mobile apps'
    ],
    cta: 'Get Started',
    popular: false
  },
  {
    name: 'Professional',
    price: '$12',
    period: 'per user/month',
    description: 'For growing teams that need more power',
    features: [
      'Unlimited team members',
      'Advanced analytics',
      'AI automations',
      'Video conferencing',
      'Priority support',
      '100GB storage',
      'Custom integrations',
      'Time tracking',
      'Gantt charts'
    ],
    cta: 'Start Free Trial',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    description: 'For large organizations with specific needs',
    features: [
      'Everything in Professional',
      'SSO & advanced security',
      'Dedicated success manager',
      'Custom workflows',
      'Unlimited storage',
      'SLA guarantee',
      'On-premise option',
      'White-label available',
      'Migration assistance'
    ],
    cta: 'Contact Sales',
    popular: false
  }
];

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(userRoles[0]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeFeatureCategory, setActiveFeatureCategory] = useState(platformFeatures[0]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div ref={containerRef} className="relative min-h-screen bg-background w-full overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div 
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link to="/" className="flex-shrink-0 flex items-center group gap-3">
                <div className="rounded-xl bg-card p-1.5 shadow-md ring-1 ring-border group-hover:shadow-lg transition-all duration-300">
                  <MeridianMark className="h-9 w-9" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Meridian
                  </span>
                  <Badge variant="outline" className="text-xs px-2 py-0 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                    v2.0
                  </Badge>
                </div>
              </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {[
                { name: 'Features', href: '#features', icon: Rocket },
                { name: 'Roles', href: '#roles', icon: Users },
                { name: 'Pricing', href: '#pricing', icon: Star },
                { name: 'FAQ', href: '#faq', icon: HelpCircle }
              ].map((item) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  className="relative px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center space-x-2">
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-300" />
                </motion.a>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-3">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleThemeToggle}
                className="relative overflow-hidden"
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {theme === 'dark' ? '🌙' : '☀️'}
                </motion.div>
              </Button>

              {/* Auth Buttons */}
              <Link to="/auth/sign-in">
                <Button variant="ghost">Sign In</Button>
              </Link>
              
              <Link to="/auth/sign-up">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                    <Rocket className="w-4 h-4 mr-2" />
                    <span>Start Free Trial</span>
                  </Button>
                </motion.div>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <motion.button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ rotate: mobileMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </motion.div>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden overflow-hidden bg-background/95 backdrop-blur-xl border-t border-border/50"
            >
              <div className="px-4 py-6 space-y-4">
                {/* Mobile Navigation Links */}
                <div className="space-y-2">
                  {[
                    { name: 'Features', href: '#features', icon: Rocket },
                    { name: 'Roles', href: '#roles', icon: Users },
                    { name: 'Pricing', href: '#pricing', icon: Star },
                    { name: 'FAQ', href: '#faq', icon: HelpCircle }
                  ].map((item) => (
                    <motion.a
                      key={item.name}
                      href={item.href}
                      className="flex items-center space-x-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      whileHover={{ x: 4 }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </motion.a>
                  ))}
                </div>

                {/* Mobile Actions */}
                <div className="pt-4 border-t border-border/50 space-y-3">
                  <Link to="/auth/sign-in" className="w-full">
                    <Button variant="ghost" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      <span>Sign In</span>
                    </Button>
                  </Link>
                  
                  <Link to="/auth/sign-up" className="w-full">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                      <Rocket className="w-4 h-4 mr-2" />
                      <span>Start Free Trial</span>
                    </Button>
                  </Link>

                  {/* Mobile Theme Toggle */}
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleThemeToggle}
                  >
                    <span className="mr-2">{theme === 'dark' ? '🌙' : '☀️'}</span>
                    Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 sm:pt-20 sm:pb-32 overflow-hidden w-full">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl" />
        
        <motion.div 
          style={{ y: heroY }}
          className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium mb-8 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>Powered by Advanced RBAC & Real-Time Collaboration</span>
              <Badge className="bg-white/20 text-white border-0 px-2 py-0">NEW</Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight"
            >
              Project Management
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Built for Every Role
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl sm:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              From <span className="font-semibold text-foreground">Workspace Managers</span> to <span className="font-semibold text-foreground">Team Members</span>, 
              Meridian adapts to your role with real-time collaboration, AI automation, and enterprise-grade security.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <Link to="/auth/sign-up">
                <Button size="lg" className="text-lg px-8 py-6 h-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto border-2">
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto mb-16"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="p-4 bg-background/60 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm"
                >
                  <div className="flex items-center justify-center mb-2">
                    <stat.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center text-sm text-muted-foreground mb-4">
                <Users className="w-4 h-4 mr-2" />
                Trusted by 50,000+ teams worldwide
              </div>
              <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
                {companyLogos.map((logo, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    whileHover={{ opacity: 1, scale: 1.05 }}
                    className="text-muted-foreground font-medium text-lg"
                  >
                    {logo}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Product Preview with Tech Stack */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-20 relative"
          >
            <div className="relative max-w-6xl mx-auto">
              {/* Tech Stack Badges */}
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                {techStack.map((tech, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm rounded-full border border-border/50 shadow-sm"
                  >
                    <tech.icon className={`w-4 h-4 ${tech.color}`} />
                    <span className="text-sm font-medium text-foreground">{tech.name}</span>
                  </motion.div>
                ))}
              </div>

              <div className="relative rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-gray-800 border-2 border-border">
                {/* Browser Chrome */}
                <div className="flex items-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-b">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-background/50 px-4 py-1 rounded-lg">
                      <Lock className="w-3 h-3" />
                      app.meridian.com
                    </div>
                  </div>
                </div>
                {/* App Content */}
                <div className="aspect-video bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 dark:from-gray-800 dark:via-gray-900 dark:to-blue-900/20 flex items-center justify-center p-8">
                  <div className="w-full h-full bg-background/40 backdrop-blur-sm rounded-lg border border-border/50 p-6 flex items-center justify-center">
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="w-24 h-24 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl"
                      >
                        <Layers className="w-12 h-12 text-white" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">See Meridian in Action</h3>
                      <p className="text-muted-foreground mb-4">Interactive demo coming soon</p>
                      <Button variant="outline" size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        Watch Video Tour
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Role-Based Features Section */}
      <section id="roles" className="py-24 bg-muted/30 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-4"
            >
              <Crown className="w-4 h-4" />
              11 Hierarchical Roles
            </motion.div>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Built for <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Every Team Member</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From executives to team members, Meridian provides role-specific views, permissions, and features
            </p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
            {userRoles.map((role, index) => (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedRole(role)}
                className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                  selectedRole.id === role.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-105'
                    : 'border-border bg-background hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${role.color} mx-auto mb-3 flex items-center justify-center`}>
                  <role.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-sm font-semibold text-foreground mb-1">{role.name}</div>
                <Badge variant="outline" className="text-xs">Level {role.level}</Badge>
              </motion.button>
            ))}
          </div>

          {/* Selected Role Details */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRole.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="p-8 bg-background rounded-2xl border-2 border-blue-600 shadow-xl"
            >
              <div className="flex items-start gap-6 mb-6">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${selectedRole.color} flex items-center justify-center flex-shrink-0`}>
                  <selectedRole.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{selectedRole.name}</h3>
                  <p className="text-muted-foreground text-lg">{selectedRole.description}</p>
                </div>
                <Badge className={`bg-gradient-to-r ${selectedRole.color} text-white border-0`}>
                  Level {selectedRole.level}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedRole.features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-foreground font-medium">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Platform Features Section */}
      <section id="features" className="py-24 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-medium mb-4"
            >
              <Sparkles className="w-4 h-4" />
              Comprehensive Feature Set
            </motion.div>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Everything Your Team Needs
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From real-time collaboration to AI-powered automation, Meridian has it all
            </p>
          </div>

          {/* Feature Categories Tabs */}
          <Tabs value={activeFeatureCategory.category} onValueChange={(value) => {
            const category = platformFeatures.find(f => f.category === value);
            if (category) setActiveFeatureCategory(category);
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-12">
              {platformFeatures.map((category) => (
                <TabsTrigger
                  key={category.category}
                  value={category.category}
                  className="flex items-center gap-2 text-base py-3"
                >
                  <category.icon className="w-5 h-5" />
                  {category.category}
                </TabsTrigger>
              ))}
            </TabsList>

            {platformFeatures.map((category) => (
              <TabsContent key={category.category} value={category.category} className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {category.features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="group p-6 bg-background rounded-xl border-2 border-border hover:border-blue-500 shadow-sm hover:shadow-lg transition-all duration-300"
                    >
                      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${category.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-blue-600 transition-colors">
                        {feature.name}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-muted/30 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-medium mb-4"
            >
              <Star className="w-4 h-4 fill-current" />
              4.9/5 Average Rating
            </motion.div>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Loved by Teams Worldwide
            </h2>
            <p className="text-xl text-muted-foreground">
              See what our customers have to say about Meridian
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="p-6 bg-background rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-foreground mb-6 leading-relaxed text-lg">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.company}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {testimonial.userRole}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-medium mb-4"
            >
              <Star className="w-4 h-4" />
              14-Day Free Trial
            </motion.div>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Choose the plan that's right for your team. No hidden fees, ever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative p-8 bg-background rounded-2xl border-2 shadow-sm hover:shadow-xl transition-all duration-300 ${
                  plan.popular ? 'border-blue-600 scale-105 shadow-blue-100 dark:shadow-blue-900/20' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-6">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground ml-2">/{plan.period}</span>
                    )}
                  </div>
                  
                  {plan.name === 'Enterprise' ? (
                    <a href="#contact" className="w-full block">
                      <Button 
                        className="w-full mb-8 h-12 text-base"
                        variant="outline"
                      >
                        {plan.cta}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </a>
                  ) : (
                    <Link to="/auth/sign-up" className="w-full">
                      <Button 
                        className={`w-full mb-8 h-12 text-base ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                      >
                        {plan.cta}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                  
                  <ul className="space-y-4 text-left">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                SOC 2 Compliant
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                GDPR Ready
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                99.9% Uptime SLA
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-500" />
                End-to-End Encrypted
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-muted/30 w-full">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-4"
            >
              <HelpCircle className="w-4 h-4" />
              Got Questions?
            </motion.div>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about Meridian
            </p>
          </div>

          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-background rounded-xl border shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <span className="font-semibold text-foreground text-lg pr-4">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openFaqIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaqIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5">
                        <p className="text-muted-foreground leading-relaxed text-base">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <p className="text-muted-foreground mb-4 text-lg">
              Still have questions? We're here to help.
            </p>
            <a href="#contact">
              <Button variant="outline" size="lg">
                <HelpCircle className="w-5 h-5 mr-2" />
                Contact Support
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 w-full">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl p-12 sm:p-16 text-white overflow-hidden shadow-2xl"
          >
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                Ready to Transform Your Team?
              </h2>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Join 50,000+ teams who've made the switch to smarter, role-based project management
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth/sign-up">
                  <Button size="lg" variant="secondary" className="text-lg px-8 py-6 h-auto bg-white text-blue-600 hover:bg-gray-100 shadow-xl">
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto border-2 border-white text-white hover:bg-white/10">
                  <Calendar className="mr-2 w-5 h-5" />
                  Schedule Demo
                </Button>
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-sm opacity-90">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  14-day free trial
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Cancel anytime
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 border-t w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-muted/80 p-1.5 ring-1 ring-border">
                  <MeridianMark className="h-9 w-9" />
                </div>
                <span className="text-xl font-bold text-foreground">Meridian</span>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
                The role-based project management platform that brings teams together with real-time collaboration, AI automation, and enterprise-grade security.
              </p>
              <div className="flex space-x-4">
                {[
                  { icon: Twitter, href: '#', label: 'Twitter' },
                  { icon: Linkedin, href: '#', label: 'LinkedIn' },
                  { icon: Github, href: '#', label: 'GitHub' }
                ].map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <social.icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-3">
                {['Features', 'Pricing', 'Integrations', 'API', 'Mobile Apps', 'Changelog'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-3">
                {['About', 'Blog', 'Careers', 'Contact', 'Partners', 'Press Kit'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Meridian. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {['Privacy Policy', 'Terms of Service', 'Security', 'Cookie Policy'].map((link) => (
                <a key={link} href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
