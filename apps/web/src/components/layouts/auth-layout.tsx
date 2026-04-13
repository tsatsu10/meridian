
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Persona = {
  key: string;
  label: string;
  role: string;
  color: string;
  bgColor: string;
  icon: string;
  tagline: string;
  scene: string;
  quote: string;
  tip: string;
};

interface AuthLayoutProps {
  children: React.ReactNode;
  persona: Persona | null;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export function AuthLayout({ children, persona, isDarkMode, toggleDarkMode }: AuthLayoutProps) {
  return (
    <div className={`min-h-screen w-full bg-gradient-to-br ${persona?.bgColor || 'from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800'} transition-all duration-700`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, 100, 0] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
        />
        <motion.div 
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{ x: [0, -100, 0], y: [0, -100, 0] }}
          transition={{ duration: 25, repeat: Infinity, repeatType: "mirror" }}
        />
      </div>

      <motion.button
        onClick={toggleDarkMode}
        className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-white/20 dark:border-zinc-700/50 shadow-lg"
        aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        whileHover={{ scale: 1.1, rotate: 15 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isDarkMode ? "sun" : "moon"}
            initial={{ opacity: 0, y: -10, rotate: -30 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: 10, rotate: 30 }}
            transition={{ duration: 0.3 }}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.button>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">K</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Meridian</h1>
            </Link>
          </div>

          <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-zinc-700/50 p-8">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
