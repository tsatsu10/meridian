/**
 * Video Communication Service
 * WebRTC room management, Agora/Twilio integration
 * Phase 4.1 - Video Communication System
 */

import { getDatabase } from '../../database/connection';
import { videoRoom, videoParticipant, videoRecording, videoInvitation, videoCallAnalytics } from '../../database/schema/video';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../logging/logger';
import crypto from 'crypto';

interface RoomConfig {
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  roomName: string;
  roomType?: string;
  hostId: string;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  maxParticipants?: number;
  settings?: any;
}

interface ParticipantConfig {
  roomId: string;
  userId: string;
  displayName: string;
  role?: string;
  permissions?: any;
}

export class VideoService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Create video room
   */
  async createRoom(config: RoomConfig): Promise<any> {
    try {
      const [room] = await this.getDb()
        .insert(videoRoom)
        .values({
          workspaceId: config.workspaceId,
          projectId: config.projectId,
          taskId: config.taskId,
          roomName: config.roomName,
          roomType: config.roomType || 'meeting',
          hostId: config.hostId,
          scheduledStartTime: config.scheduledStartTime,
          scheduledEndTime: config.scheduledEndTime,
          maxParticipants: config.maxParticipants || 50,
          settings: config.settings || {},
          status: 'scheduled',
        })
        .returning();

      logger.info('Video room created', { roomId: room.id, workspaceId: config.workspaceId });
      return room;
    } catch (error: any) {
      logger.error('Failed to create video room', { error: error.message });
      throw error;
    }
  }

  /**
   * Start video room (make it active)
   */
  async startRoom(roomId: string, hostId: string): Promise<any> {
    try {
      const [room] = await this.getDb()
        .update(videoRoom)
        .set({
          status: 'active',
          actualStartTime: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(videoRoom.id, roomId), eq(videoRoom.hostId, hostId)))
        .returning();

      if (!room) {
        throw new Error('Room not found or unauthorized');
      }

      logger.info('Video room started', { roomId });
      return room;
    } catch (error: any) {
      logger.error('Failed to start video room', { error: error.message });
      throw error;
    }
  }

  /**
   * End video room
   */
  async endRoom(roomId: string, hostId: string): Promise<any> {
    try {
      const [room] = await this.getDb()
        .update(videoRoom)
        .set({
          status: 'ended',
          actualEndTime: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(videoRoom.id, roomId), eq(videoRoom.hostId, hostId)))
        .returning();

      if (!room) {
        throw new Error('Room not found or unauthorized');
      }

      // Calculate analytics
      await this.calculateRoomAnalytics(roomId);

      logger.info('Video room ended', { roomId });
      return room;
    } catch (error: any) {
      logger.error('Failed to end video room', { error: error.message });
      throw error;
    }
  }

  /**
   * Join video room
   */
  async joinRoom(config: ParticipantConfig): Promise<any> {
    try {
      // Check if room exists and is active
      const [room] = await this.getDb()
        .select()
        .from(videoRoom)
        .where(eq(videoRoom.id, config.roomId));

      if (!room) {
        throw new Error('Room not found');
      }

      if (room.status !== 'active' && room.status !== 'scheduled') {
        throw new Error('Room is not available');
      }

      // Check participant count
      const participants = await this.getDb()
        .select()
        .from(videoParticipant)
        .where(and(
          eq(videoParticipant.roomId, config.roomId),
          eq(videoParticipant.connectionStatus, 'connected')
        ));

      if (participants.length >= (room.maxParticipants || 50)) {
        throw new Error('Room is full');
      }

      // Add participant
      const [participant] = await this.getDb()
        .insert(videoParticipant)
        .values({
          roomId: config.roomId,
          userId: config.userId,
          displayName: config.displayName,
          role: config.role || 'participant',
          permissions: config.permissions || {},
          connectionStatus: 'connected',
          isCameraOn: true,
          isMicOn: true,
        })
        .returning();

      logger.info('Participant joined room', { roomId: config.roomId, userId: config.userId });
      return { room, participant };
    } catch (error: any) {
      logger.error('Failed to join room', { error: error.message });
      throw error;
    }
  }

  /**
   * Leave video room
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    try {
      await this.getDb()
        .update(videoParticipant)
        .set({
          leftAt: new Date(),
          connectionStatus: 'disconnected',
        })
        .where(and(
          eq(videoParticipant.roomId, roomId),
          eq(videoParticipant.userId, userId)
        ));

      logger.info('Participant left room', { roomId, userId });
    } catch (error: any) {
      logger.error('Failed to leave room', { error: error.message });
      throw error;
    }
  }

  /**
   * Update participant status (camera, mic, screen share)
   */
  async updateParticipantStatus(
    roomId: string,
    userId: string,
    updates: {
      isCameraOn?: boolean;
      isMicOn?: boolean;
      isSharingScreen?: boolean;
      networkQuality?: number;
    }
  ): Promise<any> {
    try {
      const [participant] = await this.getDb()
        .update(videoParticipant)
        .set(updates)
        .where(and(
          eq(videoParticipant.roomId, roomId),
          eq(videoParticipant.userId, userId)
        ))
        .returning();

      return participant;
    } catch (error: any) {
      logger.error('Failed to update participant status', { error: error.message });
      throw error;
    }
  }

  /**
   * Start recording
   */
  async startRecording(roomId: string, startedBy: string): Promise<any> {
    try {
      await this.getDb()
        .update(videoRoom)
        .set({ isRecording: true, updatedAt: new Date() })
        .where(eq(videoRoom.id, roomId));

      // Create recording record
      const [room] = await this.getDb().select().from(videoRoom).where(eq(videoRoom.id, roomId));

      const [recording] = await this.getDb()
        .insert(videoRecording)
        .values({
          roomId,
          workspaceId: room.workspaceId,
          title: `${room.roomName} - ${new Date().toLocaleDateString()}`,
          fileUrl: `recordings/${roomId}/${Date.now()}.mp4`, // Placeholder
          startedBy,
          recordedAt: new Date(),
          processingStatus: 'processing',
        })
        .returning();

      logger.info('Recording started', { roomId, recordingId: recording.id });
      return recording;
    } catch (error: any) {
      logger.error('Failed to start recording', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(roomId: string): Promise<void> {
    try {
      await this.getDb()
        .update(videoRoom)
        .set({ isRecording: false, updatedAt: new Date() })
        .where(eq(videoRoom.id, roomId));

      // Update recording status
      await this.getDb()
        .update(videoRecording)
        .set({ processingStatus: 'completed' })
        .where(and(
          eq(videoRecording.roomId, roomId),
          eq(videoRecording.processingStatus, 'processing')
        ));

      logger.info('Recording stopped', { roomId });
    } catch (error: any) {
      logger.error('Failed to stop recording', { error: error.message });
      throw error;
    }
  }

  /**
   * Create invitation
   */
  async createInvitation(
    roomId: string,
    invitedBy: string,
    invitedUserId?: string,
    invitedEmail?: string
  ): Promise<any> {
    try {
      const accessToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const [invitation] = await this.getDb()
        .insert(videoInvitation)
        .values({
          roomId,
          invitedUserId,
          invitedEmail,
          invitedBy,
          accessToken,
          expiresAt,
          status: 'pending',
        })
        .returning();

      logger.info('Invitation created', { invitationId: invitation.id, roomId });
      return invitation;
    } catch (error: any) {
      logger.error('Failed to create invitation', { error: error.message });
      throw error;
    }
  }

  /**
   * Get room participants
   */
  async getRoomParticipants(roomId: string): Promise<any[]> {
    try {
      const participants = await this.getDb()
        .select()
        .from(videoParticipant)
        .where(eq(videoParticipant.roomId, roomId))
        .orderBy(videoParticipant.joinedAt);

      return participants;
    } catch (error: any) {
      logger.error('Failed to get participants', { error: error.message });
      throw error;
    }
  }

  /**
   * Get recordings for workspace
   */
  async getRecordings(workspaceId: string, limit: number = 20): Promise<any[]> {
    try {
      const recordings = await this.getDb()
        .select()
        .from(videoRecording)
        .where(eq(videoRecording.workspaceId, workspaceId))
        .orderBy(desc(videoRecording.recordedAt))
        .limit(limit);

      return recordings;
    } catch (error: any) {
      logger.error('Failed to get recordings', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate room analytics
   */
  private async calculateRoomAnalytics(roomId: string): Promise<void> {
    try {
      const [room] = await this.getDb().select().from(videoRoom).where(eq(videoRoom.id, roomId));
      const participants = await this.getDb()
        .select()
        .from(videoParticipant)
        .where(eq(videoParticipant.roomId, roomId));

      if (!room || participants.length === 0) return;

      const totalParticipants = participants.length;
      const connectedParticipants = participants.filter(p => p.connectionStatus === 'connected');
      const peakParticipants = Math.max(connectedParticipants.length, totalParticipants);

      let totalDuration = 0;
      let screenShareDuration = 0;
      let networkQualitySum = 0;
      let networkQualityCount = 0;

      participants.forEach(p => {
        if (p.leftAt && p.joinedAt) {
          const duration = (p.leftAt.getTime() - p.joinedAt.getTime()) / 1000;
          totalDuration += duration;

          if (p.isSharingScreen) {
            screenShareDuration += duration;
          }
        }

        if (p.networkQuality) {
          networkQualitySum += p.networkQuality;
          networkQualityCount++;
        }
      });

      const averageNetworkQuality = networkQualityCount > 0
        ? Math.round(networkQualitySum / networkQualityCount)
        : null;

      const participantMinutes = Math.round(totalDuration / 60);

      await this.getDb().insert(videoCallAnalytics).values({
        roomId,
        workspaceId: room.workspaceId,
        totalParticipants,
        peakParticipants,
        totalDuration: Math.round(totalDuration),
        averageNetworkQuality,
        screenShareDuration: Math.round(screenShareDuration),
        participantMinutes,
        qualityIssues: [],
      });

      logger.info('Room analytics calculated', { roomId });
    } catch (error: any) {
      logger.error('Failed to calculate analytics', { error: error.message });
    }
  }

  /**
   * Generate WebRTC token (Agora/Twilio)
   */
  async generateToken(roomId: string, userId: string, role: string = 'participant'): Promise<string> {
    try {
      // This would integrate with Agora or Twilio SDK
      // For now, return a placeholder token
      const token = crypto
        .createHash('sha256')
        .update(`${roomId}:${userId}:${role}:${Date.now()}`)
        .digest('hex');

      logger.info('WebRTC token generated', { roomId, userId });
      return token;
    } catch (error: any) {
      logger.error('Failed to generate token', { error: error.message });
      throw error;
    }
  }
}

export default VideoService;



