// @epic-2.2-realtime: Live cursor overlay component for real-time collaboration
import { usePresence } from '@/hooks/usePresence';

interface LiveCursorOverlayProps {
  className?: string;
}

export function LiveCursorOverlay({ className = '' }: LiveCursorOverlayProps) {
  const { liveCursors, isConnected } = usePresence();

  if (!isConnected || liveCursors.size === 0) {
    return null;
  }

  return (
    <div className={`fixed inset-0 pointer-events-none z-50 ${className}`}>
      {Array.from(liveCursors.entries()).map(([key, cursor]) => {
        const { position, userName, userEmail } = cursor;
        
        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
          return null;
        }

        // Generate a consistent color for each user based on their email
        const getUserColor = (email: string) => {
          const colors = [
            'bg-blue-500',
            'bg-green-500', 
            'bg-purple-500',
            'bg-pink-500',
            'bg-yellow-500',
            'bg-indigo-500',
            'bg-red-500',
            'bg-teal-500'
          ];
          
          let hash = 0;
          for (let i = 0; i < email.length; i++) {
            hash = email.charCodeAt(i) + ((hash << 5) - hash);
          }
          return colors[Math.abs(hash) % colors.length];
        };

        const cursorColor = getUserColor(userEmail);

        return (
          <div
            key={key}
            className="absolute transition-all duration-100 ease-out"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor pointer */}
            <div className="relative">
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                className={`drop-shadow-lg ${cursorColor.replace('bg-', 'text-')}`}
                fill="currentColor"
              >
                <path d="M5.64 5.64L19.36 12L12 19.36L9.88 12L5.64 5.64Z" />
              </svg>
              
              {/* User name label */}
              <div className={`absolute top-6 left-2 px-2 py-1 rounded text-xs text-white ${cursorColor} shadow-lg whitespace-nowrap`}>
                {userName}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 