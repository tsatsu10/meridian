import useProjectStore from "@/store/project";
import useWorkspaceStore from "@/store/workspace";
import { Link } from "@tanstack/react-router";
import { MeridianMark } from "@/components/branding/meridian-mark";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  /** When false, show logomark only (collapsed sidebar). */
  showText?: boolean;
}

export function Logo({ className = "", showText = true }: LogoProps) {
  const { setWorkspace } = useWorkspaceStore();
  const { setProject } = useProjectStore();

  return (
    <Link
      onClick={() => {
        setWorkspace(undefined);
        setProject(undefined);
      }}
      to="/dashboard"
      className={cn("flex items-center gap-2 min-w-0", className)}
    >
      <MeridianMark
        onDarkSurface
        className={cn(showText ? "h-8 w-8" : "h-9 w-9")}
      />
      {showText ? (
        <span className="text-lg text-zinc-900 dark:text-white font-semibold truncate">
          Meridian
        </span>
      ) : null}
    </Link>
  );
}
