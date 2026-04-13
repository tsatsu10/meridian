
import React, { useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Reply } from 'lucide-react';

interface SwipeToReplyProps {
  children: React.ReactNode;
  onReply: () => void;
}

export const SwipeToReply: React.FC<SwipeToReplyProps> = ({ children, onReply }) => {
  const x = useRef(0);

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    x.current = info.offset.x;
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 100) {
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      onReply();
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      style={{ x: x.current }}
      className="relative"
    >
      <motion.div
        className="absolute left-0 top-0 bottom-0 flex items-center justify-center bg-blue-500 text-white"
        style={{ width: x.current, opacity: x.current / 100 }}
      >
        <Reply className="w-6 h-6" />
      </motion.div>
      {children}
    </motion.div>
  );
};
