import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { MeridianMark } from "@/components/branding/meridian-mark";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export function AuthLayout({ 
  children, 
  title, 
  subtitle, 
  gradientFrom = "from-blue-400 via-purple-400 to-cyan-400",
  gradientTo = "to-purple-600"
}: AuthLayoutProps) {
  return (
    <div className={`w-full bg-gradient-to-br ${gradientFrom} ${gradientTo} relative`}>
      {/* Background Shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 py-12">
        
        {/* Logo and Branding */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="rounded-2xl bg-white/95 p-3 shadow-2xl ring-1 ring-white/40">
              <MeridianMark className="h-14 w-14" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Meridian
          </h1>
          <p className="text-white/80 text-lg">
            Fast, Efficient and Productive
          </p>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
            {/* Card Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-white/30 rounded-3xl" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-full blur-2xl" />
            
            <div className="relative z-10">
              {/* Card Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {title}
                </h2>
                <p className="text-gray-600">
                  {subtitle}
                </p>
              </div>

              {/* Form Content */}
              {children}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex items-center space-x-6 text-white/70"
        >
          {/* Language Selector */}
          <div className="flex items-center space-x-2 cursor-pointer hover:text-white transition-colors">
            <div className="w-6 h-4 bg-white/20 rounded-sm flex items-center justify-center">
              <span className="text-xs font-medium">🇺🇸</span>
            </div>
            <span className="text-sm font-medium">English</span>
            <Globe className="w-4 h-4" />
          </div>

          {/* Footer Links */}
          <div className="flex items-center space-x-4 text-sm">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Plans</a>
            <a href="#" className="hover:text-white transition-colors">Contact Us</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
