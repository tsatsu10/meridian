import { cn } from "@/lib/cn";
import { useUserPreferencesStore } from "@/store/user-preferences";
import { SidebarContent } from "./sidebar-content";
import SidebarFooter from "./sidebar-footer";
import { SidebarHeader } from "./sidebar-header";

export function Sidebar() {
  const { isSidebarOpened, setIsSidebarOpened } = useUserPreferencesStore();

  return (
    <>
      <div
        onClick={() => setIsSidebarOpened()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setIsSidebarOpened();
          }
        }}
        className={cn(
          "fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm",
          isSidebarOpened ? "opacity-100" : "opacity-0 pointer-events-none",
          "transition-opacity duration-300 ease-in-out",
        )}
      />

      <div className="w-16 shrink-0 lg:hidden" />

      <div
        className={cn(
          "flex flex-col",
          // Modern glass morphism effect
          "bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-800/60",
          "backdrop-blur-xl backdrop-saturate-150",
          "border-r border-white/[0.08]",
          "shadow-[0_0_30px_rgba(0,0,0,0.3)]",
          // Positioning
          "fixed lg:relative top-0 left-0 bottom-0",
          "z-30",
          // Transition
          "transition-all duration-300 ease-in-out",
          !isSidebarOpened ? "w-16" : "w-64",
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,rgba(120,119,198,0.3),transparent)]" />
        <div className="relative z-10 flex flex-col h-full">
        <SidebarHeader />
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
        <div className="relative z-10">
          <SidebarFooter />
          </div>
        </div>
      </div>
    </>
  );
}
