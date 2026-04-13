// WebRTC service utilities and peer connection management

import { CallParticipant, PeerConnection } from './webrtcSlice';
import { logger } from "../../../lib/logger";

// Configuration
export const WEBRTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Add TURN servers for production
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
  ],
  iceCandidatePoolSize: 10,
};

export const DATA_CHANNEL_CONFIG: RTCDataChannelInit = {
  ordered: true,
  maxRetransmits: 3,
};

// WebRTC Service Class
export class WebRTCService {
  private signalingSocket: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private dataChannels = new Map<string, RTCDataChannel>();
  private onParticipantUpdate?: (participant: Partial<CallParticipant>) => void;
  private onConnectionStateChange?: (participantId: string, state: RTCPeerConnectionState) => void;
  private onError?: (error: Error) => void;

  constructor(
    signalingServerUrl: string,
    callbacks: {
      onParticipantUpdate?: (participant: Partial<CallParticipant>) => void;
      onConnectionStateChange?: (participantId: string, state: RTCPeerConnectionState) => void;
      onError?: (error: Error) => void;
    } = {}
  ) {
    this.onParticipantUpdate = callbacks.onParticipantUpdate;
    this.onConnectionStateChange = callbacks.onConnectionStateChange;
    this.onError = callbacks.onError;
    this.initializeSignaling(signalingServerUrl);
  }

  // Initialize signaling connection
  private initializeSignaling(url: string): void {
    try {
      this.signalingSocket = new WebSocket(url);
      
      this.signalingSocket.onopen = () => {
        logger.info("Signaling connection established");
      };
      
      this.signalingSocket.onmessage = (event) => {
        this.handleSignalingMessage(JSON.parse(event.data));
      };
      
      this.signalingSocket.onclose = () => {
        logger.info("Signaling connection closed");
        // Implement reconnection logic
        this.reconnectSignaling(url);
      };
      
      this.signalingSocket.onerror = (error) => {
        console.error('Signaling error:', error);
        this.onError?.(new Error('Signaling connection failed'));
      };
    } catch (error) {
      console.error('Failed to initialize signaling:', error);
      this.onError?.(error as Error);
    }
  }

  // Reconnect signaling with exponential backoff
  private reconnectSignaling(url: string, attempt = 1): void {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    
    setTimeout(() => {
      if (!this.signalingSocket || this.signalingSocket.readyState === WebSocket.CLOSED) {
        logger.info("Reconnecting to signaling server (attempt ${attempt})");
        this.initializeSignaling(url);
      }
    }, delay);
  }

  // Handle signaling messages
  private async handleSignalingMessage(message: any): Promise<void> {
    try {
      switch (message.type) {
        case 'offer':
          await this.handleOffer(message.participantId, message.offer);
          break;
        case 'answer':
          await this.handleAnswer(message.participantId, message.answer);
          break;
        case 'ice-candidate':
          await this.handleIceCandidate(message.participantId, message.candidate);
          break;
        case 'participant-joined':
          this.handleParticipantJoined(message.participant);
          break;
        case 'participant-left':
          this.handleParticipantLeft(message.participantId);
          break;
        case 'participant-updated':
          this.handleParticipantUpdated(message.participant);
          break;
        default:
          console.warn('Unknown signaling message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      this.onError?.(error as Error);
    }
  }

  // Send signaling message
  private sendSignalingMessage(message: any): void {
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: signaling connection not open');
    }
  }

  // Create peer connection for a participant
  async createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection(WEBRTC_CONFIG);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      logger.info("Received remote track from:");
      this.handleRemoteStream(participantId, event.streams[0]);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          participantId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      logger.info("Connection state for ${participantId}:");
      this.onConnectionStateChange?.(participantId, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'failed') {
        this.handleConnectionFailure(participantId);
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      logger.info("ICE connection state for ${participantId}:");
    };

    // Create data channel for chat and control messages
    const dataChannel = peerConnection.createDataChannel('control', DATA_CHANNEL_CONFIG);
    this.setupDataChannel(participantId, dataChannel);

    // Handle incoming data channels
    peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(participantId, event.channel);
    };

    this.peerConnections.set(participantId, peerConnection);
    return peerConnection;
  }

  // Setup data channel handlers
  private setupDataChannel(participantId: string, dataChannel: RTCDataChannel): void {
    dataChannel.onopen = () => {
      logger.info("Data channel opened for ${participantId}");
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleDataChannelMessage(participantId, message);
      } catch (error) {
        console.error('Failed to parse data channel message:', error);
      }
    };

    dataChannel.onclose = () => {
      logger.info("Data channel closed for ${participantId}");
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error for ${participantId}:`, error);
    };

    this.dataChannels.set(participantId, dataChannel);
  }

  // Handle data channel messages
  private handleDataChannelMessage(participantId: string, message: any): void {
    switch (message.type) {
      case 'chat':
        // Handle chat message
        break;
      case 'mute':
        this.onParticipantUpdate?.({ id: participantId, isMuted: message.muted });
        break;
      case 'video':
        this.onParticipantUpdate?.({ id: participantId, isVideoOff: !message.enabled });
        break;
      default:
        logger.info("Unknown data channel message:");
    }
  }

  // Handle WebRTC offer
  private async handleOffer(participantId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = await this.createPeerConnection(participantId);
    
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    this.sendSignalingMessage({
      type: 'answer',
      participantId,
      answer,
    });
  }

  // Handle WebRTC answer
  private async handleAnswer(participantId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer);
    }
  }

  // Handle ICE candidate
  private async handleIceCandidate(participantId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate);
    }
  }

  // Handle participant events
  private handleParticipantJoined(participant: CallParticipant): void {
    logger.info("Participant joined:");
    this.onParticipantUpdate?.(participant);
  }

  private handleParticipantLeft(participantId: string): void {
    logger.info("Participant left:");
    this.closePeerConnection(participantId);
  }

  private handleParticipantUpdated(participant: Partial<CallParticipant>): void {
    logger.info("Participant updated:");
    this.onParticipantUpdate?.(participant);
  }

  // Handle remote stream
  private handleRemoteStream(participantId: string, stream: MediaStream): void {
    logger.info("Handling remote stream for:");
    // This would typically update the UI to show the remote video
    this.onParticipantUpdate?.({ id: participantId, stream });
  }

  // Handle connection failure
  private async handleConnectionFailure(participantId: string): Promise<void> {
    logger.info("Handling connection failure for:");
    
    // Try to restart ICE
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      try {
        await peerConnection.restartIce();
      } catch (error) {
        console.error('Failed to restart ICE:', error);
        this.closePeerConnection(participantId);
      }
    }
  }

  // Public methods
  async setLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    
    // Add tracks to existing peer connections
    for (const [participantId, peerConnection] of this.peerConnections) {
      // Remove old tracks
      const senders = peerConnection.getSenders();
      for (const sender of senders) {
        if (sender.track) {
          peerConnection.removeTrack(sender);
        }
      }
      
      // Add new tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
    }
  }

  async createOffer(participantId: string): Promise<void> {
    const peerConnection = await this.createPeerConnection(participantId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    this.sendSignalingMessage({
      type: 'offer',
      participantId,
      offer,
    });
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
    
    // Notify other participants
    this.broadcastDataChannelMessage({
      type: 'mute',
      muted: !enabled,
    });
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
    
    // Notify other participants
    this.broadcastDataChannelMessage({
      type: 'video',
      enabled,
    });
  }

  sendChatMessage(message: string): void {
    this.broadcastDataChannelMessage({
      type: 'chat',
      message,
      timestamp: Date.now(),
    });
  }

  private broadcastDataChannelMessage(message: any): void {
    const messageStr = JSON.stringify(message);
    for (const dataChannel of this.dataChannels.values()) {
      if (dataChannel.readyState === 'open') {
        dataChannel.send(messageStr);
      }
    }
  }

  getConnectionStats(participantId: string): Promise<RTCStatsReport | null> {
    const peerConnection = this.peerConnections.get(participantId);
    return peerConnection ? peerConnection.getStats() : Promise.resolve(null);
  }

  closePeerConnection(participantId: string): void {
    const peerConnection = this.peerConnections.get(participantId);
    const dataChannel = this.dataChannels.get(participantId);
    
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(participantId);
    }
    
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(participantId);
    }
  }

  destroy(): void {
    // Close all peer connections
    for (const participantId of this.peerConnections.keys()) {
      this.closePeerConnection(participantId);
    }
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close signaling connection
    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }
  }
}

// Media utilities
export class MediaUtils {
  static async getAvailableDevices(): Promise<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
  }> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return {
      audioInputs: devices.filter(device => device.kind === 'audioinput'),
      videoInputs: devices.filter(device => device.kind === 'videoinput'),
      audioOutputs: devices.filter(device => device.kind === 'audiooutput'),
    };
  }

  static async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error(`Failed to access media devices: ${error.message}`);
    }
  }

  static async getDisplayMedia(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
    } catch (error) {
      console.error('Failed to get display media:', error);
      throw new Error(`Failed to access screen sharing: ${error.message}`);
    }
  }

  static stopMediaStream(stream: MediaStream): void {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }

  static async changeAudioDevice(stream: MediaStream, deviceId: string): Promise<MediaStream> {
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId } },
      video: false,
    });

    // Replace audio track
    const oldAudioTrack = stream.getAudioTracks()[0];
    const newAudioTrack = newStream.getAudioTracks()[0];

    if (oldAudioTrack) {
      stream.removeTrack(oldAudioTrack);
      oldAudioTrack.stop();
    }

    if (newAudioTrack) {
      stream.addTrack(newAudioTrack);
    }

    return stream;
  }

  static async changeVideoDevice(stream: MediaStream, deviceId: string): Promise<MediaStream> {
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { deviceId: { exact: deviceId } },
    });

    // Replace video track
    const oldVideoTrack = stream.getVideoTracks()[0];
    const newVideoTrack = newStream.getVideoTracks()[0];

    if (oldVideoTrack) {
      stream.removeTrack(oldVideoTrack);
      oldVideoTrack.stop();
    }

    if (newVideoTrack) {
      stream.addTrack(newVideoTrack);
    }

    return stream;
  }

  static getAudioLevel(stream: MediaStream): number {
    // This would require Web Audio API implementation
    // Simplified version for now
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return 0;

    // In a real implementation, you'd use AudioContext and AnalyserNode
    return Math.random() * 100; // Placeholder
  }

  static async applyAudioConstraints(
    stream: MediaStream, 
    constraints: {
      echoCancellation?: boolean;
      noiseSuppression?: boolean;
      autoGainControl?: boolean;
    }
  ): Promise<void> {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      await audioTrack.applyConstraints(constraints);
    }
  }

  static async applyVideoConstraints(
    stream: MediaStream,
    constraints: {
      width?: number;
      height?: number;
      frameRate?: number;
    }
  ): Promise<void> {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      await videoTrack.applyConstraints(constraints);
    }
  }
}

// Statistics monitoring
export class CallStatsMonitor {
  private statsInterval: NodeJS.Timeout | null = null;
  private onStatsUpdate?: (stats: any) => void;

  constructor(onStatsUpdate?: (stats: any) => void) {
    this.onStatsUpdate = onStatsUpdate;
  }

  startMonitoring(webrtcService: WebRTCService, participantIds: string[], intervalMs = 1000): void {
    this.stopMonitoring();

    this.statsInterval = setInterval(async () => {
      const allStats = {};

      for (const participantId of participantIds) {
        try {
          const stats = await webrtcService.getConnectionStats(participantId);
          if (stats) {
            allStats[participantId] = this.parseStats(stats);
          }
        } catch (error) {
          console.error(`Failed to get stats for ${participantId}:`, error);
        }
      }

      this.onStatsUpdate?.(allStats);
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private parseStats(statsReport: RTCStatsReport): any {
    const parsed = {
      bitrate: { audio: 0, video: 0 },
      packetLoss: 0,
      roundTripTime: 0,
      jitter: 0,
      resolution: { width: 0, height: 0 },
    };

    statsReport.forEach((report) => {
      switch (report.type) {
        case 'inbound-rtp':
          if (report.mediaType === 'audio') {
            parsed.bitrate.audio = report.bytesReceived || 0;
          } else if (report.mediaType === 'video') {
            parsed.bitrate.video = report.bytesReceived || 0;
            parsed.resolution.width = report.frameWidth || 0;
            parsed.resolution.height = report.frameHeight || 0;
          }
          parsed.packetLoss = report.packetsLost || 0;
          parsed.jitter = report.jitter || 0;
          break;
        case 'candidate-pair':
          if (report.state === 'succeeded') {
            parsed.roundTripTime = report.currentRoundTripTime || 0;
          }
          break;
      }
    });

    return parsed;
  }
}

export default WebRTCService;