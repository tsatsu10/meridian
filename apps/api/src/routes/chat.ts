import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middlewares/auth';
import { z } from 'zod';
import { validateRequest } from '../middlewares/validate-request';

const router = Router();

// Schema for creating a channel
const createChannelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['public', 'private', 'direct']),
  memberIds: z.array(z.string().uuid()).optional()
});

// Schema for sending a message
const sendMessageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['text', 'file']).default('text'),
  parentId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
});

// Get all channels for workspace
router.get('/workspaces/:workspaceId/channels', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const channels = await prisma.channel.findMany({
      where: {
        workspaceId,
        OR: [
          { type: 'public' },
          {
            type: 'private',
            members: {
              some: { userId: req.user.id }
            }
          }
        ]
      },
      include: {
        _count: {
          select: { members: true }
        },
        members: {
          where: { userId: req.user.id },
          select: { lastReadAt: true, role: true, isMuted: true }
        }
      }
    });
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Create a new channel
router.post('/workspaces/:workspaceId/channels', authenticateToken, validateRequest(createChannelSchema), async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, type, memberIds } = req.body;

    const channel = await prisma.channel.create({
      data: {
        workspaceId,
        name,
        description,
        type,
        createdBy: req.user.id,
        members: {
          create: [
            { userId: req.user.id, role: 'owner' },
            ...(memberIds?.map(userId => ({ userId, role: 'member' })) || [])
          ]
        }
      }
    });

    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// Get channel messages
router.get('/channels/:channelId/messages', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify channel membership
    const member = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId: req.user.id
        }
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a channel member' });
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId,
        ...(before ? { createdAt: { lt: new Date(String(before)) } } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        },
        reactions: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        },
        mentions: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/channels/:channelId/messages', authenticateToken, validateRequest(sendMessageSchema), async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, type, parentId, metadata } = req.body;

    // Verify channel membership
    const member = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId: req.user.id
        }
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a channel member' });
    }

    const message = await prisma.message.create({
      data: {
        channelId,
        userId: req.user.id,
        content,
        type,
        parentId,
        metadata
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Add reaction to message
router.post('/messages/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const reaction = await prisma.messageReaction.create({
      data: {
        messageId,
        userId: req.user.id,
        emoji
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(reaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Remove reaction from message
router.delete('/messages/:messageId/reactions/:emoji', authenticateToken, async (req, res) => {
  try {
    const { messageId, emoji } = req.params;

    await prisma.messageReaction.delete({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: req.user.id,
          emoji
        }
      }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// Update channel member settings
router.patch('/channels/:channelId/settings', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { isMuted } = req.body;

    const member = await prisma.channelMember.update({
      where: {
        channelId_userId: {
          channelId,
          userId: req.user.id
        }
      },
      data: { isMuted }
    });

    res.json(member);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router; 
