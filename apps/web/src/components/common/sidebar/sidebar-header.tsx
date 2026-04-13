import { useUserPreferencesStore } from "@/store/user-preferences";
import { X, Menu } from "lucide-react";
import { Logo } from "../logo";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";

export function SidebarHeader() {
  const { isSidebarOpened, setIsSidebarOpened } = useUserPreferencesStore();

  return (
    <div
      className={cn(
        "flex gap-3 p-4 border-b border-white/[0.08]",
        isSidebarOpened ? "flex-row items-center" : "flex-col items-center justify-center"
      )}
    >
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsSidebarOpened()}
        className={cn(
          "relative p-2 rounded-xl transition-all duration-200",
          "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-blue-500/10 before:via-purple-500/10 before:to-pink-500/10 before:opacity-0 before:transition-opacity",
          "hover:before:opacity-100",
          "after:absolute after:inset-0 after:rounded-xl after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] after:opacity-0 after:transition-opacity",
          "hover:after:opacity-100",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
          "active:scale-95"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isSidebarOpened ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpened ? (
          <X className="w-5 h-5 text-slate-400 hover:text-white transition-colors duration-200 relative z-10" />
        ) : (
          <Menu className="w-5 h-5 text-slate-400 hover:text-white transition-colors duration-200 relative z-10" />
        )}
      </motion.button>

      {/* Brand: full wordmark when expanded, mark-only when collapsed */}
      <motion.div
        className="flex items-center gap-3 opacity-100 transition-opacity duration-200 min-w-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        <Logo showText={isSidebarOpened} />
      </motion.div>
    </div>
  );
}
