/**
 * Video Communication API Routes
 * Phase 4.1 - Video Communication System
 */

import { Hono } from 'hono';
import { VideoService } from '../services/video/video-service';
import { logger } from '../services/logging/logger';

const app = new Hono();
const videoService = new VideoService();

/**
 * POST /api/video/rooms
 * Create video room
 */
app.post('/rooms', async (c) => {
  try {
    const body = await c.req.json();
    const {
      workspaceId,
      projectId,
      taskId,
      roomName,
      roomType,
      hostId,
      scheduledStartTime,
      scheduledEndTime,
      maxParticipants,
      settings,
    } = body;

    if (!workspaceId || !roomName || !hostId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const room = await videoService.createRoom({
      workspaceId,
      projectId,
      taskId,
      roomName,
      roomType,
      hostId,
      scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : undefined,
      scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : undefined,
      maxParticipants,
      settings,
    });

    return c.json({ room }, 201);
  } catch (error: any) {
    logger.error('Failed to create room', { error: error.message });
    return c.json({ error: 'Failed to create room' }, 500);
  }
});

/**
 * PUT /api/video/rooms/:id/start
 * Start video room
 */
app.put('/rooms/:id/start', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { hostId } = body;

    if (!hostId) {
      return c.json({ error: 'hostId is required' }, 400);
    }

    const room = await videoService.startRoom(id, hostId);
    return c.json({ room });
  } catch (error: any) {
    logger.error('Failed to start room', { error: error.message });
    return c.json({ error: 'Failed to start room' }, 500);
  }
});

/**
 * PUT /api/video/rooms/:id/end
 * End video room
 */
app.put('/rooms/:id/end', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { hostId } = body;

    if (!hostId) {
      return c.json({ error: 'hostId is required' }, 400);
    }

    const room = await videoService.endRoom(id, hostId);
    return c.json({ room });
  } catch (error: any) {
    logger.error('Failed to end room', { error: error.message });
    return c.json({ error: 'Failed to end room' }, 500);
  }
});

/**
 * POST /api/video/rooms/:id/join
 * Join video room
 */
app.post('/rooms/:id/join', async (c) => {
  try {
    const roomId = c.req.param('id');
    const body = await c.req.json();
    const { userId, displayName, role, permissions } = body;

    if (!userId || !displayName) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const result = await videoService.joinRoom({
      roomId,
      userId,
      displayName,
      role,
      permissions,
    });

    // Generate WebRTC token
    const token = await videoService.generateToken(roomId, userId, role);

    return c.json({ ...result, token });
  } catch (error: any) {
    logger.error('Failed to join room', { error: error.message });
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/video/rooms/:id/leave
 * Leave video room
 */
app.post('/rooms/:id/leave', async (c) => {
  try {
    const roomId = c.req.param('id');
    const body = await c.req.json();
    const { userId } = body;

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    await videoService.leaveRoom(roomId, userId);
    return c.json({ message: 'Left room successfully' });
  } catch (error: any) {
    logger.error('Failed to leave room', { error: error.message });
    return c.json({ error: 'Failed to leave room' }, 500);
  }
});

/**
 * PUT /api/video/rooms/:id/participant
 * Update participant status
 */
app.put('/rooms/:id/participant', async (c) => {
  try {
    const roomId = c.req.param('id');
    const body = await c.req.json();
    const { userId, isCameraOn, isMicOn, isSharingScreen, networkQuality } = body;

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const participant = await videoService.updateParticipantStatus(roomId, userId, {
      isCameraOn,
      isMicOn,
      isSharingScreen,
      networkQuality,
    });

    return c.json({ participant });
  } catch (error: any) {
    logger.error('Failed to update participant', { error: error.message });
    return c.json({ error: 'Failed to update participant' }, 500);
  }
});

/**
 * GET /api/video/rooms/:id/participants
 * Get room participants
 */
app.get('/rooms/:id/participants', async (c) => {
  try {
    const roomId = c.req.param('id');
    const participants = await videoService.getRoomParticipants(roomId);
    return c.json({ participants });
  } catch (error: any) {
    logger.error('Failed to get participants', { error: error.message });
    return c.json({ error: 'Failed to get participants' }, 500);
  }
});

/**
 * POST /api/video/rooms/:id/recording/start
 * Start recording
 */
app.post('/rooms/:id/recording/start', async (c) => {
  try {
    const roomId = c.req.param('id');
    const body = await c.req.json();
    const { startedBy } = body;

    if (!startedBy) {
      return c.json({ error: 'startedBy is required' }, 400);
    }

    const recording = await videoService.startRecording(roomId, startedBy);
    return c.json({ recording }, 201);
  } catch (error: any) {
    logger.error('Failed to start recording', { error: error.message });
    return c.json({ error: 'Failed to start recording' }, 500);
  }
});

/**
 * POST /api/video/rooms/:id/recording/stop
 * Stop recording
 */
app.post('/rooms/:id/recording/stop', async (c) => {
  try {
    const roomId = c.req.param('id');
    await videoService.stopRecording(roomId);
    return c.json({ message: 'Recording stopped' });
  } catch (error: any) {
    logger.error('Failed to stop recording', { error: error.message });
    return c.json({ error: 'Failed to stop recording' }, 500);
  }
});

/**
 * POST /api/video/rooms/:id/invite
 * Create invitation
 */
app.post('/rooms/:id/invite', async (c) => {
  try {
    const roomId = c.req.param('id');
    const body = await c.req.json();
    const { invitedBy, invitedUserId, invitedEmail } = body;

    if (!invitedBy || (!invitedUserId && !invitedEmail)) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const invitation = await videoService.createInvitation(
      roomId,
      invitedBy,
      invitedUserId,
      invitedEmail
    );

    return c.json({ invitation }, 201);
  } catch (error: any) {
    logger.error('Failed to create invitation', { error: error.message });
    return c.json({ error: 'Failed to create invitation' }, 500);
  }
});

/**
 * GET /api/video/recordings
 * Get recordings
 */
app.get('/recordings', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const limit = parseInt(c.req.query('limit') || '20');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const recordings = await videoService.getRecordings(workspaceId, limit);
    return c.json({ recordings });
  } catch (error: any) {
    logger.error('Failed to get recordings', { error: error.message });
    return c.json({ error: 'Failed to get recordings' }, 500);
  }
});

/**
 * GET /api/video/token
 * Generate WebRTC token
 */
app.get('/token', async (c) => {
  try {
    const roomId = c.req.query('roomId');
    const userId = c.req.query('userId');
    const role = c.req.query('role') || 'participant';

    if (!roomId || !userId) {
      return c.json({ error: 'roomId and userId are required' }, 400);
    }

    const token = await videoService.generateToken(roomId, userId, role);
    return c.json({ token });
  } catch (error: any) {
    logger.error('Failed to generate token', { error: error.message });
    return c.json({ error: 'Failed to generate token' }, 500);
  }
});

export default app;


