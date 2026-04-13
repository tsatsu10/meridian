/**
 * Safe Sonner wrapper that prevents useState context errors
 * This component is completely isolated from React context system
 */
import * as React from "react";

// Null-safe Sonner component
function SafeSonnerToaster() {
  try {
    // Dynamic import to prevent context issues at module load time
    const [SonnerComponent, setSonnerComponent] = React.useState<any>(null);
    
    React.useEffect(() => {
      let mounted = true;
      
      // Delay import to ensure all contexts are ready
      setTimeout(async () => {
        try {
          if (!mounted) return;
          
          const { Toaster } = await import("sonner");
          if (mounted) {
            setSonnerComponent(() => Toaster);
          }
        } catch (error) {
          console.warn('Failed to load Sonner:', error);
        }
      }, 200);
      
      return () => {
        mounted = false;
      };
    }, []);
    
    // Don't render anything until Sonner is safely loaded
    if (!SonnerComponent) {
      return null;
    }
    
    // Render with safe props
    return React.createElement(SonnerComponent, {
      className: "toaster group",
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }
    });
  } catch (error) {
    console.warn('SafeSonnerToaster error:', error);
    return null;
  }
}

// Export as Toaster for drop-in replacement
export const Toaster = SafeSonnerToaster;