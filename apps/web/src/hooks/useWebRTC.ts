import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from "../lib/logger";

const SIGNAL_URL = 'ws://localhost:8081';

export function useWebRTC(roomId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [connected, setConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const ws = useRef<WebSocket | null>(null);
  const peers = useRef<Record<string, RTCPeerConnection>>({});
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: Send signaling message
  const send = useCallback((msg: any) => {
    ws.current?.send(JSON.stringify(msg));
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (!localStream || isRecording) return;
    
    try {
      // Create a combined stream with local and remote streams
      const streams = [localStream, ...Object.values(remoteStreamsRef.current)];
      const combinedStream = new MediaStream();
      
      // Add all video and audio tracks
      streams.forEach(stream => {
        stream.getTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      });

      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000,  // 128 kbps
      };

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-call-${roomId}-${new Date().toISOString()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        recordingChunksRef.current = [];
      };

      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [localStream, isRecording, roomId]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, [isRecording]);

  // Start local media and join room
  const startCall = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      }, 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    setLocalStream(stream);
    ws.current = new WebSocket(SIGNAL_URL);
    ws.current.onopen = () => {
      send({ type: 'join', roomId });
      setConnected(true);
    };
    ws.current.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'peer-joined') {
        // New peer: create offer
        const pc = createPeerConnection('remote');
        peers.current['remote'] = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: 'offer', roomId, payload: offer });
      }
      if (msg.type === 'offer') {
        // Incoming offer: create answer
        const pc = createPeerConnection('remote');
        peers.current['remote'] = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: 'answer', roomId, payload: answer });
      }
      if (msg.type === 'answer') {
        await peers.current['remote']?.setRemoteDescription(new RTCSessionDescription(msg.payload));
      }
      if (msg.type === 'ice-candidate') {
        await peers.current['remote']?.addIceCandidate(new RTCIceCandidate(msg.payload));
      }
      if (msg.type === 'peer-left') {
        // Remove remote stream
        setRemoteStreams({});
        remoteStreamsRef.current = {};
        peers.current['remote']?.close();
        delete peers.current['remote'];
      }
    };
    ws.current.onclose = () => setConnected(false);
  }, [roomId, send]);

  // Create peer connection with enhanced configuration
  function createPeerConnection(peerId: string) {
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });
    
    pc.onicecandidate = (e) => {
      if (e.candidate) send({ type: 'ice-candidate', roomId, payload: e.candidate });
    };
    
    pc.ontrack = (e) => {
      remoteStreamsRef.current[peerId] = e.streams[0];
      setRemoteStreams({ ...remoteStreamsRef.current });
    };

    // Enhanced connection monitoring
    pc.onconnectionstatechange = () => {
      logger.info("Peer ${peerId} connection state:");
    };

    pc.oniceconnectionstatechange = () => {
      logger.info("Peer ${peerId} ICE connection state:");
    };

    return pc;
  }

  // Leave call
  const leaveCall = useCallback(() => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    
    // Only send leave message if WebSocket is open
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'leave', roomId }));
    }
    
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      ws.current.close();
    }
    
    setConnected(false);
    setLocalStream(null);
    setRemoteStreams({});
    Object.values(peers.current).forEach(pc => pc.close());
    peers.current = {};
  }, [roomId, isRecording, stopRecording]);

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      leaveCall();
    };
    // eslint-disable-next-line
  }, []);

  return {
    startCall,
    leaveCall,
    localStream,
    remoteStreams: Object.values(remoteStreams),
    connected,
    startRecording,
    stopRecording,
    isRecording,
    recordingTime: formatRecordingTime(recordingTime),
  };
} 