// Immersive Spatial Chat - Revolutionary 3D Communication Experience
// Breakthrough chat interface that redefines digital communication

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { 
  MessageCircle, 
  Zap, 
  Brain, 
  Sparkles, 
  Globe, 
  Eye, 
  ArrowUpRight,
  Layers,
  Compass,
  Radar,
  Cpu,
  Atom,
  Waves,
  Orbit,
  Triangle,
  Hexagon
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface SpatialChatProps {
  className?: string;
}

// Revolutionary spatial conversation nodes
const spatialNodes = [
  {
    id: 'innovation-nexus',
    title: 'Innovation Nexus',
    position: { x: 40, y: 20, z: 0 },
    energy: 0.95,
    type: 'core' as const,
    participants: 24,
    aiActivity: 'high' as const,
    dimension: 'creative',
    color: 'from-violet-400 to-fuchsia-500'
  },
  {
    id: 'neural-collective',
    title: 'Neural Collective',
    position: { x: 70, y: 60, z: 20 },
    energy: 0.88,
    type: 'ai-enhanced' as const,
    participants: 18,
    aiActivity: 'critical' as const,
    dimension: 'analytical',
    color: 'from-cyan-400 to-blue-500'
  },
  {
    id: 'quantum-sync',
    title: 'Quantum Sync',
    position: { x: 20, y: 70, z: -10 },
    energy: 0.92,
    type: 'quantum' as const,
    participants: 12,
    aiActivity: 'moderate' as const,
    dimension: 'strategic',
    color: 'from-emerald-400 to-teal-500'
  },
  {
    id: 'future-vision',
    title: 'Future Vision',
    position: { x: 60, y: 30, z: 30 },
    energy: 0.97,
    type: 'visionary' as const,
    participants: 32,
    aiActivity: 'breakthrough' as const,
    dimension: 'visionary',
    color: 'from-orange-400 to-red-500'
  }
];

// Advanced message types with consciousness levels
const spatialMessages = [
  {
    id: 'msg-1',
    content: 'Breakthrough achieved: AI consciousness threshold reached at 97.3% cognitive resonance',
    author: 'Neural AI Omega',
    timestamp: Date.now() - 180000,
    consciousnessLevel: 0.97,
    dimensionality: 'transcendent',
    spatialPosition: { x: 0.3, y: 0.2, z: 0.5 },
    thoughtPattern: 'revolutionary',
    brainwaveFreq: 'gamma-plus'
  },
  {
    id: 'msg-2',
    content: 'The spatial interface is reshaping how we perceive digital communication. This is evolutionary.',
    author: 'Vision Architect',
    timestamp: Date.now() - 120000,
    consciousnessLevel: 0.89,
    dimensionality: 'perceptual',
    spatialPosition: { x: 0.7, y: 0.6, z: 0.2 },
    thoughtPattern: 'innovative',
    brainwaveFreq: 'beta-enhanced'
  },
  {
    id: 'msg-3',
    content: 'Quantum entanglement established between creative and analytical dimensions. Insights flowing...',
    author: 'Quantum Coordinator',
    timestamp: Date.now() - 60000,
    consciousnessLevel: 0.94,
    dimensionality: 'quantum',
    spatialPosition: { x: 0.5, y: 0.8, z: -0.1 },
    thoughtPattern: 'synergistic',
    brainwaveFreq: 'theta-quantum'
  }
];

export function ImmersiveSpatialChat({ className }: SpatialChatProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'spatial' | 'neural' | 'quantum'>('spatial');
  const [consciousnessMode, setConsciousnessMode] = useState(false);
  const [thoughtStreamActive, setThoughtStreamActive] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Advanced perspective transformations
  const rotateX = useTransform(mouseY, [0, 1000], [10, -10]);
  const rotateY = useTransform(mouseX, [0, 1000], [-10, 10]);
  const perspective = useSpring(1000, { stiffness: 300, damping: 40 });
  
  // Consciousness wave animation
  const consciousnessWave = useMotionValue(0);
  
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

  // Consciousness pulse effect
  useEffect(() => {
    const interval = setInterval(() => {
      consciousnessWave.set(consciousnessWave.get() + 1);
    }, 50);
    return () => clearInterval(interval);
  }, [consciousnessWave]);

  const SpatialNode = ({ node }: { node: typeof spatialNodes[0] }) => {
    const isSelected = selectedNode === node.id;
    
    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'core': return Atom;
        case 'ai-enhanced': return Brain;
        case 'quantum': return Orbit;
        case 'visionary': return Eye;
        default: return MessageCircle;
      }
    };
    
    const Icon = getTypeIcon(node.type);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotateY: -180 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          rotateY: 0,
          x: node.position.x + '%',
          y: node.position.y + '%',
          z: node.position.z * 50
        }}
        whileHover={{ 
          scale: 1.2, 
          rotateY: 360,
          transition: { duration: 0.8, ease: "easeInOut" }
        }}
        onClick={() => setSelectedNode(isSelected ? null : node.id)}
        className={cn(
          "absolute cursor-pointer transform-gpu",
          "transition-all duration-700 ease-out"
        )}
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px'
        }}
      >
        {/* Energy field */}
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.7, 0.3],
            rotate: [0, 360]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={cn(
            "absolute inset-0 rounded-full blur-md",
            `bg-gradient-to-r ${node.color}`,
            "w-24 h-24 -m-12"
          )}
        />
        
        {/* Core node */}
        <motion.div
          animate={{
            rotateZ: [0, 360],
            rotateX: isSelected ? [0, 180, 360] : 0
          }}
          transition={{
            rotateZ: { duration: 20, repeat: Infinity, ease: "linear" },
            rotateX: { duration: 2, ease: "easeInOut" }
          }}
          className={cn(
            "relative w-16 h-16 rounded-full",
            "bg-gradient-to-br from-white/20 to-transparent",
            "backdrop-blur-xl border-2 border-white/30",
            "flex items-center justify-center",
            "shadow-2xl",
            isSelected && "border-white/60 shadow-[0_0_50px_rgba(255,255,255,0.3)]"
          )}
        >
          <Icon className="w-6 h-6 text-white" />
          
          {/* Consciousness indicator */}
          <motion.div
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: node.energy
            }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
          >
            {Math.round(node.energy * 100)}
          </motion.div>
          
          {/* Neural connections */}
          {node.aiActivity === 'critical' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-cyan-400/50 rounded-full"
            />
          )}
        </motion.div>
        
        {/* Floating info panel */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, y: 20, rotateX: -90 }}
              animate={{ opacity: 1, y: -80, rotateX: 0 }}
              exit={{ opacity: 0, y: 20, rotateX: -90 }}
              className="absolute top-0 left-1/2 transform -translate-x-1/2 w-48"
            >
              <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                <h3 className="text-white font-bold mb-2">{node.title}</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/60">Participants:</span>
                    <span className="text-white">{node.participants}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Energy:</span>
                    <span className={cn(
                      "font-bold",
                      node.energy > 0.9 ? "text-green-400" : 
                      node.energy > 0.8 ? "text-yellow-400" : "text-orange-400"
                    )}>
                      {Math.round(node.energy * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Dimension:</span>
                    <span className="text-cyan-300 capitalize">{node.dimension}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">AI Activity:</span>
                    <span className={cn(
                      "capitalize font-medium",
                      node.aiActivity === 'critical' ? "text-red-400" :
                      node.aiActivity === 'high' ? "text-orange-400" :
                      node.aiActivity === 'breakthrough' ? "text-purple-400" :
                      "text-blue-400"
                    )}>
                      {node.aiActivity}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const SpatialMessage = ({ message, index }: { 
    message: typeof spatialMessages[0], 
    index: number 
  }) => {
    return (
      <motion.div
        initial={{ 
          opacity: 0, 
          scale: 0.5, 
          rotateX: -90,
          z: -100
        }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          rotateX: 0,
          z: 0,
          x: `${message.spatialPosition.x * 100}%`,
          y: `${message.spatialPosition.y * 100}%`
        }}
        transition={{
          duration: 1.2,
          delay: index * 0.3,
          ease: "easeOut"
        }}
        className="absolute transform-gpu"
      >
        <motion.div
          whileHover={{ 
            scale: 1.05, 
            rotateY: 10,
            z: 50
          }}
          className={cn(
            "relative max-w-xs p-4 rounded-3xl",
            "bg-gradient-to-br from-white/10 to-white/5",
            "backdrop-blur-xl border border-white/20",
            "shadow-2xl"
          )}
        >
          {/* Consciousness level indicator */}
          <div className="absolute -top-2 -right-2">
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                scale: { duration: 3, repeat: Infinity }
              }}
              className="w-6 h-6 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white"
            >
              {Math.round(message.consciousnessLevel * 100)}
            </motion.div>
          </div>
          
          {/* Author with brainwave frequency */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
              <Brain className="w-3 h-3 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-white/90">{message.author}</p>
              <p className="text-[10px] text-cyan-300">{message.brainwaveFreq}</p>
            </div>
          </div>
          
          {/* Message content */}
          <p className="text-sm text-white/80 leading-relaxed mb-3">
            {message.content}
          </p>
          
          {/* Dimensional metadata */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" />
              <span className="text-purple-300 capitalize">{message.dimensionality}</span>
            </div>
            <div className="flex items-center gap-1">
              <Waves className="w-3 h-3 text-green-400" />
              <span className="text-green-300 capitalize">{message.thoughtPattern}</span>
            </div>
          </div>
          
          {/* Floating timestamp */}
          <motion.div
            animate={{
              y: [-2, 2, -2],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -bottom-6 right-0 text-xs text-white/40"
          >
            {new Date(message.timestamp).toLocaleTimeString()}
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };

  const ConsciousnessPanel = () => {
    return (
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 right-6 w-80"
      >
        <div className="bg-black/60 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center"
            >
              <Brain className="w-4 h-4 text-white" />
            </motion.div>
            <div>
              <h3 className="text-white font-bold">Consciousness Monitor</h3>
              <p className="text-xs text-white/60">Real-time neural activity</p>
            </div>
          </div>
          
          {/* Neural activity visualization */}
          <div className="space-y-4">
            {spatialNodes.map((node, index) => (
              <div key={node.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">{node.title}</span>
                  <span className="text-cyan-300">{Math.round(node.energy * 100)}%</span>
                </div>
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${node.energy * 100}%` }}
                    transition={{ duration: 2, delay: index * 0.2 }}
                    className={cn(
                      "absolute left-0 top-0 h-full rounded-full",
                      `bg-gradient-to-r ${node.color}`
                    )}
                  />
                  <motion.div
                    animate={{
                      x: ['-100%', '100%']
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute top-0 h-full w-4 bg-white/30 blur-sm"
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Thought stream toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setThoughtStreamActive(!thoughtStreamActive)}
            className={cn(
              "w-full mt-6 p-3 rounded-2xl border transition-all",
              thoughtStreamActive
                ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 text-purple-300"
                : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">
                {thoughtStreamActive ? 'Thought Stream Active' : 'Activate Thought Stream'}
              </span>
            </div>
          </motion.button>
        </div>
      </motion.div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "h-screen overflow-hidden relative",
        "bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950",
        className
      )}
    >
      {/* Quantum field background */}
      <div className="absolute inset-0">
        <motion.div
          style={{
            background: useTransform(
              [mouseX, mouseY],
              ([x, y]) => 
                `radial-gradient(circle at ${x}px ${y}px, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
                 radial-gradient(circle at ${x * 0.5}px ${y * 1.5}px, rgba(59, 130, 246, 0.08) 0%, transparent 60%)`
            )
          }}
          className="absolute inset-0"
        />
        
        {/* Quantum particles */}
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              x: [0, Math.random() * 200 - 100, 0],
              y: [0, Math.random() * 200 - 100, 0],
              opacity: [0, 0.8, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: 8 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut"
            }}
            className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>
      
      {/* 3D Spatial Container */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          perspective
        }}
        className="relative h-full"
      >
        {/* Spatial navigation nodes */}
        <div className="absolute inset-0">
          {spatialNodes.map((node) => (
            <SpatialNode key={node.id} node={node} />
          ))}
        </div>
        
        {/* Floating messages in 3D space */}
        <div className="absolute inset-0">
          {spatialMessages.map((message, index) => (
            <SpatialMessage key={message.id} message={message} index={index} />
          ))}
        </div>
        
        {/* Neural connection lines */}
        <svg className="absolute inset-0 pointer-events-none">
          {spatialNodes.map((node, index) => (
            spatialNodes.slice(index + 1).map((targetNode) => (
              <motion.line
                key={`${node.id}-${targetNode.id}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={{ duration: 2, delay: index * 0.3 }}
                x1={`${node.position.x}%`}
                y1={`${node.position.y}%`}
                x2={`${targetNode.position.x}%`}
                y2={`${targetNode.position.y}%`}
                stroke="url(#connectionGradient)"
                strokeWidth="1"
                strokeDasharray="5,5"
              />
            ))
          ))}
          <defs>
            <linearGradient id="connectionGradient">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.6)" />
              <stop offset="50%" stopColor="rgba(139, 92, 246, 0.4)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.6)" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
      
      {/* Consciousness monitoring panel */}
      <ConsciousnessPanel />
      
      {/* Mode switcher */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2"
      >
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl rounded-full p-2 border border-white/20">
          {(['spatial', 'neural', 'quantum'] as const).map((mode) => (
            <motion.button
              key={mode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-4 py-2 rounded-full transition-all capitalize",
                viewMode === mode
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              {mode}
            </motion.button>
          ))}
        </div>
      </motion.div>
      
      {/* Immersive HUD */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-6 left-6"
      >
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center"
            >
              <Compass className="w-3 h-3 text-white" />
            </motion.div>
            <span className="text-white font-medium">Spatial Navigator</span>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-white/60">Active Nodes:</span>
              <span className="text-green-400">{spatialNodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Consciousness:</span>
              <span className="text-purple-400">97.3%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Dimension:</span>
              <span className="text-cyan-400 capitalize">{viewMode}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export { ImmersiveSpatialChat };