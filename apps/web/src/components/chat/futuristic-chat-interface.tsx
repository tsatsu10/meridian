// Futuristic Chat Interface - Next-Gen Innovation
// Revolutionary chat experience with advanced UX paradigms

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { 
  Send, 
  Mic, 
  Video, 
  Phone,
  Users,
  Search,
  Sparkles,
  Zap,
  Brain,
  Globe,
  Eye,
  ArrowRight,
  Plus,
  MoreHorizontal,
  Orbit
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { MeridianButton } from '@/components/ui/meridian-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface FuturisticChatInterfaceProps {
  className?: string;
}

// AI-powered message suggestions
const aiSuggestions = [
  "Let's schedule a team sync for tomorrow",
  "I'll review the latest designs and get back to you",
  "Great work on the project milestone! 🎉",
  "Can you share the updated requirements?"
];

// Holographic conversation data
const conversations = [
  {
    id: 'team-alpha',
    name: 'Team Alpha',
    type: 'ai-enhanced' as const,
    lastMessage: 'AI analyzed 5 action items from your meeting',
    participants: 8,
    aiInsights: 3,
    priority: 'high' as const,
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=alpha&backgroundColor=6366f1',
    energy: 0.9
  },
  {
    id: 'product-vision',
    name: 'Product Vision',
    type: 'immersive' as const,
    lastMessage: 'Interactive prototype ready for review',
    participants: 12,
    aiInsights: 7,
    priority: 'medium' as const,
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=vision&backgroundColor=8b5cf6',
    energy: 0.7
  },
  {
    id: 'innovation-lab',
    name: 'Innovation Lab',
    type: 'neural' as const,
    lastMessage: 'Neural network suggests 3 optimizations',
    participants: 5,
    aiInsights: 12,
    priority: 'critical' as const,
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=lab&backgroundColor=06b6d4',
    energy: 1.0
  }
];

const messages = [
  {
    id: '1',
    content: 'Just analyzed our sprint velocity - we\'re 23% ahead of target! 🚀',
    userEmail: 'ai@meridian.app',
    userName: 'Meridian AI',
    userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ai',
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    isOwn: false,
    type: 'ai-insight' as const,
    confidence: 0.95,
    reactions: [{ emoji: '🤖', count: 3 }, { emoji: '🚀', count: 7 }]
  },
  {
    id: '2',
    content: 'Love seeing the data-driven insights! The new chat interface is performing beautifully.',
    userEmail: 'sarah@meridian.app',
    userName: 'Sarah Chen',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    createdAt: new Date(Date.now() - 3 * 60 * 1000),
    isOwn: false,
    type: 'enhanced' as const,
    brainwave: 0.8
  },
  {
    id: '3',
    content: 'This is exactly the innovation we needed! The spatial design is mind-blowing 🤯',
    userEmail: 'you@meridian.app',
    userName: 'You',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=you',
    createdAt: new Date(Date.now() - 1 * 60 * 1000),
    isOwn: true,
    type: 'emotional' as const,
    sentiment: 0.95
  }
];

export function FuturisticChatInterface({ className }: FuturisticChatInterfaceProps) {
  const [selectedChat, setSelectedChat] = useState('team-alpha');
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [showNeural, setShowNeural] = useState(false);
  const [brainwaveActive, setBrainwaveActive] = useState(false);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Advanced parallax effects
  const parallaxX = useTransform(mouseX, [0, 1000], [-20, 20]);
  const parallaxY = useTransform(mouseY, [0, 1000], [-20, 20]);
  
  // Dynamic gradient based on mouse position
  const gradientX = useTransform(mouseX, [0, 1000], ['0%', '100%']);
  const gradientY = useTransform(mouseY, [0, 1000], ['0%', '100%']);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Neural network activation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setBrainwaveActive(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const ConversationOrb = ({ conversation, isSelected }: { 
    conversation: typeof conversations[0], 
    isSelected: boolean 
  }) => {
    const controls = useAnimation();
    
    useEffect(() => {
      controls.start({
        scale: isSelected ? 1.1 : 1,
        rotateY: isSelected ? 360 : 0,
        transition: { duration: 0.8, ease: "easeInOut" }
      });
    }, [isSelected, controls]);

    const getPriorityGlow = (priority: string) => {
      switch (priority) {
        case 'critical': return 'shadow-[0_0_50px_rgba(239,68,68,0.6)]';
        case 'high': return 'shadow-[0_0_30px_rgba(245,158,11,0.5)]';
        default: return 'shadow-[0_0_20px_rgba(59,130,246,0.4)]';
      }
    };

    return (
      <motion.div
        animate={controls}
        whileHover={{ 
          scale: 1.15, 
          rotateX: 15,
          transition: { duration: 0.3 }
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setSelectedChat(conversation.id)}
        className={cn(
          "relative cursor-pointer group",
          "transform-gpu perspective-1000"
        )}
      >
        {/* Neural network connections */}
        <motion.div
          animate={{
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={cn(
            "absolute inset-0 rounded-full blur-sm",
            getPriorityGlow(conversation.priority)
          )}
        />
        
        {/* Main orb */}
        <div className={cn(
          "relative w-16 h-16 rounded-full overflow-hidden",
          "bg-gradient-to-br from-white/20 to-white/5",
          "backdrop-blur-xl border border-white/20",
          "transition-all duration-500",
          isSelected && "border-white/40 shadow-2xl"
        )}>
          <Avatar className="w-full h-full">
            <AvatarImage src={conversation.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
              {conversation.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          {/* Energy pulse */}
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: conversation.energy
            }}
            className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 to-purple-500/30 rounded-full"
          />
          
          {/* AI insights indicator */}
          {conversation.aiInsights > 0 && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
            >
              {conversation.aiInsights}
            </motion.div>
          )}
        </div>
        
        {/* Floating name */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
        >
          <div className="bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
            {conversation.name}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const HolographicMessage = ({ message }: { message: typeof messages[0] }) => {
    const isOwn = message.isOwn;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, rotateX: -15 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn(
          "relative mb-6 transform-gpu",
          isOwn ? "ml-auto max-w-[80%]" : "mr-auto max-w-[80%]"
        )}
      >
        {/* Message container with glassmorphism */}
        <div className={cn(
          "relative p-4 rounded-[2rem] overflow-hidden",
          "backdrop-blur-xl border",
          isOwn 
            ? "bg-gradient-to-br from-blue-500/20 to-purple-600/20 border-blue-400/30 ml-auto" 
            : "bg-gradient-to-br from-white/10 to-white/5 border-white/20"
        )}>
          {/* Dynamic background particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  x: [0, 30, 0],
                  y: [0, -20, 0],
                  opacity: [0.1, 0.3, 0.1]
                }}
                transition={{
                  duration: 4 + i,
                  repeat: Infinity,
                  delay: i * 0.5
                }}
                className={cn(
                  "absolute w-2 h-2 rounded-full",
                  "bg-gradient-to-r from-cyan-400 to-blue-500"
                )}
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${30 + i * 20}%`
                }}
              />
            ))}
          </div>
          
          {/* User info with neural activity */}
          {!isOwn && (
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.userAvatar} />
                  <AvatarFallback>{message.userName[0]}</AvatarFallback>
                </Avatar>
                {message.type === 'ai-insight' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center"
                  >
                    <Brain className="w-2 h-2 text-white" />
                  </motion.div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">{message.userName}</p>
                {message.type === 'ai-insight' && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span className="text-xs text-cyan-300">AI Confidence: {(message.confidence! * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Message content with enhanced typography */}
          <div className="relative z-10">
            <p className={cn(
              "text-sm leading-relaxed",
              isOwn ? "text-white" : "text-white/90",
              message.type === 'ai-insight' && "font-medium"
            )}>
              {message.content}
            </p>
            
            {/* Message metadata */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-white/60">
                {message.createdAt.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              
              {/* Advanced metrics */}
              <div className="flex items-center gap-2">
                {message.type === 'emotional' && message.sentiment && (
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center gap-1"
                  >
                    <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full" />
                    <span className="text-xs text-pink-300">
                      {(message.sentiment * 100).toFixed(0)}% positive
                    </span>
                  </motion.div>
                )}
                
                {message.brainwave && (
                  <motion.div
                    animate={{ 
                      opacity: brainwaveActive ? 1 : 0.3,
                      scale: brainwaveActive ? 1.1 : 1
                    }}
                    className="flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-yellow-300">
                      {(message.brainwave * 100).toFixed(0)}% engagement
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
          
          {/* Holographic reactions */}
          {message.reactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="flex gap-1 mt-3"
            >
              {message.reactions.map((reaction, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.2, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
                >
                  <span className="text-sm">{reaction.emoji}</span>
                  <span className="text-xs text-white/80">{reaction.count}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  const NeuralComposer = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative p-6"
      >
        {/* Neural background */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <motion.div
            animate={{
              background: [
                "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 50%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)",
                "radial-gradient(circle at 50% 20%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)"
              ]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute inset-0"
          />
        </div>
        
        {/* AI Suggestions */}
        <AnimatePresence>
          {aiMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl border border-purple-400/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">AI Suggestions</span>
              </div>
              <div className="grid gap-2">
                {aiSuggestions.slice(0, 2).map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setMessage(suggestion)}
                    className="text-left p-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/80 hover:text-white transition-all"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main input */}
        <div className="relative">
          <div className={cn(
            "flex items-end gap-4 p-4 rounded-3xl",
            "bg-gradient-to-r from-white/10 to-white/5",
            "backdrop-blur-xl border border-white/20",
            "transition-all duration-500",
            "hover:border-white/40 focus-within:border-white/40"
          )}>
            {/* Text input */}
            <div className="flex-1">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Compose your message with AI assistance..."
                rows={1}
                className={cn(
                  "w-full bg-transparent border-0 outline-none resize-none",
                  "text-white placeholder-white/50 text-sm leading-relaxed",
                  "min-h-[20px] max-h-32"
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    // Handle send
                  }
                }}
              />
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* AI Mode Toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setAiMode(!aiMode)}
                className={cn(
                  "p-2 rounded-full transition-all",
                  aiMode 
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg" 
                    : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                )}
              >
                <Brain className="w-4 h-4" />
              </motion.button>
              
              {/* Voice input */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsRecording(!isRecording)}
                className={cn(
                  "p-2 rounded-full transition-all",
                  isRecording 
                    ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg animate-pulse" 
                    : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                )}
              >
                <Mic className="w-4 h-4" />
              </motion.button>
              
              {/* Send button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                disabled={!message.trim()}
                className={cn(
                  "p-2 rounded-full transition-all",
                  message.trim()
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                    : "bg-white/10 text-white/50 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "h-screen overflow-hidden relative",
        "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900",
        className
      )}
    >
      {/* Dynamic background */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: useTransform(
            [gradientX, gradientY],
            ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgba(59, 130, 246, 0.15) 0%, transparent 50%)`
          )
        }}
      />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              opacity: [0, 0.6, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: 15 + i * 2,
              repeat: Infinity,
              delay: i * 0.5
            }}
            className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>
      
      {/* Main interface */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Futuristic header */}
        <motion.header
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-6 bg-gradient-to-r from-black/20 to-black/10 backdrop-blur-xl border-b border-white/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center"
              >
                <Orbit className="w-4 h-4 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Neural Communication Hub
                </h1>
                <p className="text-sm text-white/60">AI-Enhanced Team Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <MeridianButton
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white border-white/20 hover:bg-white/10"
              >
                <Search className="w-4 h-4 mr-2" />
                Neural Search
              </MeridianButton>
              <MeridianButton
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white border-white/20 hover:bg-white/10"
              >
                <Users className="w-4 h-4 mr-2" />
                Presence
              </MeridianButton>
            </div>
          </div>
        </motion.header>
        
        {/* Conversation orbs */}
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="p-6"
        >
          <div className="flex items-center gap-6 mb-4">
            <h2 className="text-lg font-semibold text-white/90">Active Conversations</h2>
            <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-400/30">
              {conversations.length} Neural Networks Active
            </Badge>
          </div>
          
          <div className="flex gap-8">
            {conversations.map((conversation) => (
              <ConversationOrb
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedChat === conversation.id}
              />
            ))}
          </div>
        </motion.div>
        
        {/* Message stream */}
        <div className="flex-1 px-6 overflow-hidden">
          <motion.div
            style={{ x: parallaxX, y: parallaxY }}
            className="h-full overflow-y-auto space-y-4"
          >
            {messages.map((message) => (
              <HolographicMessage key={message.id} message={message} />
            ))}
          </motion.div>
        </div>
        
        {/* Neural composer */}
        <NeuralComposer />
      </div>
    </div>
  );
}

export { FuturisticChatInterface };