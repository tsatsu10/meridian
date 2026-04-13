// @epic-1.1-rbac: Enhanced login form with Magic UI integration
// @persona-sarah: PM needs secure, efficient workspace access
// @persona-jennifer: Exec needs executive login with SSO options
// @persona-david: Team lead needs team workspace access
// @persona-mike: Dev needs development environment access
// @persona-lisa: Designer needs design tool integration access

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  LogIn,
  Github,
  Chrome,
  Slack,
  Shield,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { MeridianMark } from "@/components/branding/meridian-mark";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// SSO Providers with Magic UI styling
const SSO_PROVIDERS = [
  {
    id: "google",
    name: "Google",
    icon: Chrome,
    color: "bg-blue-500 hover:bg-blue-600",
    description: "Continue with Google Workspace"
  },
  {
    id: "github",
    name: "GitHub",
    icon: Github,
    color: "bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900",
    description: "Continue with GitHub"
  },
  {
    id: "slack",
    name: "Slack",
    icon: Slack,
    color: "bg-purple-600 hover:bg-purple-700",
    description: "Continue with Slack"
  }
];

// Security features highlight
const SECURITY_FEATURES = [
  { icon: Shield, label: "Enterprise Security", description: "SOC 2 Type II certified" },
  { icon: Activity, label: "Real-time Monitoring", description: "24/7 security monitoring" },
  { icon: CheckCircle2, label: "Data Protection", description: "GDPR & CCPA compliant" }
];

// Demo accounts for different personas
const DEMO_ACCOUNTS = [
  {
    role: "project-manager",
    name: "Sarah Johnson",
    email: "sarah@demo.meridian.io",
    description: "Project Manager Experience",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800"
  },
  {
    role: "team-lead",
    name: "David Thompson", 
    email: "david@demo.meridian.io",
    description: "Team Lead Experience",
    color: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800"
  },
  {
    role: "stakeholder",
    name: "Jennifer Wilson",
    email: "jennifer@demo.meridian.io", 
    description: "Executive Experience",
    color: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800"
  }
];

interface LoginFormProps {
  onLogin?: (credentials: { email: string; password: string }) => void;
  onSSO?: (provider: string) => void;
  className?: string;
  showDemo?: boolean;
}

export default function LoginForm({ 
  onLogin, 
  onSSO, 
  className,
  showDemo = true 
}: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Validate form
  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (onLogin) {
        onLogin(formData);
      } else {
        toast.success("Login successful!");
      }
    } catch (error) {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle SSO login
  const handleSSO = async (provider: string) => {
    setIsLoading(true);
    
    try {
      // Simulate SSO redirect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onSSO) {
        onSSO(provider);
      } else {
        toast.success(`Redirecting to ${provider}...`);
      }
    } catch (error) {
      toast.error("SSO login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle demo login
  const handleDemoLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
    setFormData({
      email: account.email,
      password: "demo123456"
    });
    toast.success(`Demo account loaded: ${account.name}`);
  };

  return (
    <div className={cn("w-full max-w-md space-y-6", className)}>
      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass-card border-border/50 backdrop-blur-xl bg-white/95 dark:bg-black/95">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="rounded-xl bg-primary/5 p-2 ring-1 ring-primary/10">
                <MeridianMark className="h-10 w-10" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl font-bold gradient-text">Welcome back</CardTitle>
              <CardDescription className="text-base mt-2">
                Sign in to your Meridian workspace
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={cn(
                      "pl-10 glass-card",
                      errors.email && "border-red-500 focus:border-red-500"
                    )}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 flex items-center"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.email}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className={cn(
                      "pl-10 pr-10 glass-card",
                      errors.password && "border-red-500 focus:border-red-500"
                    )}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 flex items-center"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.password}
                  </motion.p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full glass-card bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2"
                  >
                    <Activity className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* SSO Providers */}
            <div className="space-y-3">
              {SSO_PROVIDERS.map((provider) => {
                const IconComponent = provider.icon;
                return (
                  <Button
                    key={provider.id}
                    variant="outline"
                    className="w-full glass-card justify-start"
                    onClick={() => handleSSO(provider.id)}
                    disabled={isLoading}
                  >
                    <IconComponent className="h-4 w-4 mr-3" />
                    {provider.description}
                  </Button>
                );
              })}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button variant="link" className="p-0 h-auto text-primary">
                Sign up <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <Button variant="link" className="p-0 h-auto text-primary">
                Forgot your password?
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Demo Accounts */}
      {showDemo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Zap className="h-5 w-5 mr-2 text-primary" />
                Try Demo Accounts
              </CardTitle>
              <CardDescription>
                Explore different user experiences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEMO_ACCOUNTS.map((account) => (
                <motion.div
                  key={account.role}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between p-4 h-auto glass-card",
                      account.color
                    )}
                    onClick={() => handleDemoLogin(account)}
                    disabled={isLoading}
                  >
                    <div className="text-left">
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs opacity-70">{account.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Security Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {SECURITY_FEATURES.map((feature) => {
          const IconComponent = feature.icon;
          return (
            <div
              key={feature.label}
              className="text-center p-3 glass-card rounded-lg border border-border/50"
            >
              <IconComponent className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">{feature.label}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
} 