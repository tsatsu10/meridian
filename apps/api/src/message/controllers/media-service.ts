// @epic-3.6-communication: Voice messages and media preview controller
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../../database/connection";
import { messageTable, 
  attachmentTable,
  channelTable,
  userTable } from "../../database/schema";
import logger from '../../utils/logger';
import { createId } from "@paralleldrive/cuid2";
import UnifiedWebSocketServer from "../../realtime/unified-websocket-server";
import fs from "fs/promises";
import path from "path";

// Validation schemas
export const voiceMessageSchema = z.object({
  channelId: z.string(),
  duration: z.number().min(1).max(300), // 5 minutes max
  fileSize: z.number().min(1).max(50 * 1024 * 1024), // 50MB max
  waveform: z.array(z.number()).optional(), // Audio waveform data
  transcription: z.string().optional(), // AI transcription
});

export const mediaPreviewSchema = z.object({
  messageId: z.string(),
  attachmentId: z.string(),
  previewType: z.enum(["thumbnail", "metadata", "text_extract"]),
});

// Supported media types
const SUPPORTED_AUDIO_TYPES = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/mov', 'video/avi'];
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// Send voice message
export async function sendVoiceMessage(
  voiceData: z.infer<typeof voiceMessageSchema>,
  userEmail: string,
  audioFileBuffer: Buffer,
  fileName: string
) {
  const db = await getDatabase();
  try {
    const { channelId, duration, fileSize, waveform, transcription } = voiceData;
    
    // Generate unique file paths
    const fileId = createId();
    const fileExtension = path.extname(fileName);
    const storedFileName = `voice_${fileId}${fileExtension}`;
    const filePath = path.join('uploads', 'voice', storedFileName);
    
    // Ensure upload directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Save audio file
    await fs.writeFile(filePath, audioFileBuffer);
    
    // Create attachment record
    const attachment = {
      id: fileId,
      name: fileName,
      originalName: fileName,
      mimeType: 'audio/webm', // Default for voice messages
      size: fileSize,
      url: `/uploads/voice/${storedFileName}`,
      uploadedBy: userEmail,
      metadata: JSON.stringify({
        duration,
        waveform: waveform || [],
        transcription: transcription || null,
        isVoiceMessage: true,
      }),
    };

    await db.insert(attachmentTable).values(attachment);

    // Create message with voice attachment
    const messageId = createId();
    const messageContent = transcription || '[Voice Message]';
    
    const message = {
      id: messageId,
      channelId,
      userEmail,
      content: messageContent,
      messageType: 'voice' as const,
      attachments: JSON.stringify([attachment]),
    };

    await db.insert(messageTable).values(message);

    // Get user info for response
    const [user] = await db
      .select({
        name: userTable.name,
        avatarUrl: userTable.avatarUrl,
      })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    const responseMessage = {
      ...message,
      user: user || { name: "Unknown User", avatarUrl: null },
      attachments: [attachment],
    };

    // Emit WebSocket event for real-time delivery
    try {
      await unifiedWebSocketService.broadcastToChannel(channelId, {
        type: "message:voice_sent",
        data: {
          messageId,
          channelId,
          userEmail,
          message: responseMessage,
          voiceData: {
            duration,
            waveform: waveform || [],
            transcription,
          },
        },
      });
    } catch (wsError) {
      logger.error("Error emitting voice message:", wsError);
    }

    return {
      success: true,
      message: responseMessage,
      voiceData: {
        duration,
        waveform: waveform || [],
        transcription,
        fileUrl: attachment.url,
      },
    };
  } catch (error) {
    logger.error("Error sending voice message:", error);
    throw new Error("Failed to send voice message");
  }
}

// Generate media preview for attachments
export async function generateMediaPreview(
  messageId: string,
  attachmentId: string,
  previewType: "thumbnail" | "metadata" | "text_extract"
) {
  const db = await getDatabase();
  try {
    // Get message and attachment info
    const [message] = await db
      .select({
        id: messageTable.id,
        attachments: messageTable.attachments,
        channelId: messageTable.channelId,
      })
      .from(messageTable)
      .where(eq(messageTable.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error("Message not found");
    }

    const attachments = message.attachments ? JSON.parse(message.attachments) : [];
    const attachment = attachments.find((att: any) => att.id === attachmentId);

    if (!attachment) {
      throw new Error("Attachment not found");
    }

    let preview: any = {
      attachmentId,
      messageId,
      previewType,
      generatedAt: new Date().toISOString(),
    };

    switch (previewType) {
      case "thumbnail":
        preview = await generateThumbnail(attachment);
        break;
      case "metadata":
        preview = await extractMetadata(attachment);
        break;
      case "text_extract":
        preview = await extractText(attachment);
        break;
    }

    // Store preview in database (you might want a separate preview table)
    // For now, we'll return the preview directly

    // Emit WebSocket event for real-time preview
    try {
      await unifiedWebSocketService.broadcastToChannel(message.channelId, {
        type: "message:preview_generated",
        data: {
          messageId,
          attachmentId,
          previewType,
          preview,
        },
      });
    } catch (wsError) {
      logger.error("Error emitting preview update:", wsError);
    }

    return { success: true, preview };
  } catch (error) {
    logger.error("Error generating media preview:", error);
    throw new Error("Failed to generate media preview");
  }
}

// Generate thumbnail for images/videos
async function generateThumbnail(attachment: any) {
  try {
    const { mimeType, url, name } = attachment;
    
    if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      // For images, we can use the original as thumbnail or generate a smaller version
      return {
        type: "image_thumbnail",
        thumbnailUrl: url, // In production, generate actual thumbnail
        originalUrl: url,
        dimensions: { width: 0, height: 0 }, // Extract from image
        fileSize: attachment.size,
      };
    }
    
    if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) {
      // Generate video thumbnail (frame at specific time)
      return {
        type: "video_thumbnail",
        thumbnailUrl: url.replace(/\.[^/.]+$/, "_thumb.jpg"), // Mock thumbnail
        originalUrl: url,
        duration: 0, // Extract from video metadata
        dimensions: { width: 0, height: 0 },
        fileSize: attachment.size,
      };
    }

    return {
      type: "no_thumbnail",
      message: "Thumbnail not available for this file type",
    };
  } catch (error) {
    logger.error("Error generating thumbnail:", error);
    return {
      type: "error",
      message: "Failed to generate thumbnail",
    };
  }
}

// Extract metadata from media files
async function extractMetadata(attachment: any) {
  try {
    const { mimeType, size, name, url } = attachment;
    
    const metadata: any = {
      fileName: name,
      fileSize: size,
      mimeType,
      uploadUrl: url,
    };

    if (SUPPORTED_AUDIO_TYPES.includes(mimeType)) {
      metadata.type = "audio";
      metadata.duration = 0; // Extract from audio file
      metadata.bitrate = 0;
      metadata.sampleRate = 0;
    } else if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) {
      metadata.type = "video";
      metadata.duration = 0; // Extract from video file
      metadata.resolution = { width: 0, height: 0 };
      metadata.framerate = 0;
      metadata.codec = "";
    } else if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      metadata.type = "image";
      metadata.dimensions = { width: 0, height: 0 };
      metadata.colorDepth = 0;
      metadata.hasAlpha = false;
    } else if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType)) {
      metadata.type = "document";
      metadata.pageCount = 0;
      metadata.hasText = true;
    }

    return {
      type: "metadata",
      metadata,
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error extracting metadata:", error);
    return {
      type: "error",
      message: "Failed to extract metadata",
    };
  }
}

// Extract text content from documents
async function extractText(attachment: any) {
  try {
    const { mimeType, url, name } = attachment;
    
    if (mimeType === 'text/plain') {
      // Read plain text file
      try {
        const filePath = path.join(process.cwd(), url);
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          type: "text_content",
          text: content.substring(0, 5000), // Limit to 5000 chars
          fullLength: content.length,
          preview: content.substring(0, 200) + (content.length > 200 ? "..." : ""),
        };
      } catch (fileError) {
        return {
          type: "error",
          message: "Failed to read text file",
        };
      }
    }
    
    if (mimeType === 'application/pdf') {
      // Extract text from PDF (would need PDF parser library)
      return {
        type: "pdf_text",
        text: "[PDF text extraction not implemented]",
        pageCount: 0,
        preview: "This is a PDF document. Full text extraction coming soon.",
      };
    }

    return {
      type: "no_text",
      message: "Text extraction not available for this file type",
    };
  } catch (error) {
    logger.error("Error extracting text:", error);
    return {
      type: "error",
      message: "Failed to extract text",
    };
  }
}

// Get voice message transcription
export async function getVoiceTranscription(messageId: string, userEmail: string) {
  const db = await getDatabase();
  try {
    const [message] = await db
      .select({
        id: messageTable.id,
        attachments: messageTable.attachments,
        channelId: messageTable.channelId,
        userEmail: messageTable.userEmail,
      })
      .from(messageTable)
      .where(eq(messageTable.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error("Message not found");
    }

    const attachments = message.attachments ? JSON.parse(message.attachments) : [];
    const voiceAttachment = attachments.find((att: any) => {
      const metadata = att.metadata ? JSON.parse(att.metadata) : {};
      return metadata.isVoiceMessage;
    });

    if (!voiceAttachment) {
      throw new Error("Voice message not found");
    }

    const metadata = voiceAttachment.metadata ? JSON.parse(voiceAttachment.metadata) : {};
    
    return {
      messageId,
      transcription: metadata.transcription || null,
      duration: metadata.duration || 0,
      waveform: metadata.waveform || [],
      hasTranscription: Boolean(metadata.transcription),
    };
  } catch (error) {
    logger.error("Error getting voice transcription:", error);
    throw new Error("Failed to get voice transcription");
  }
}

// Update voice message transcription (from AI service)
export async function updateVoiceTranscription(
  messageId: string,
  transcription: string,
  confidence: number = 1.0
) {
  const db = await getDatabase();
  try {
    const [message] = await db
      .select({
        id: messageTable.id,
        attachments: messageTable.attachments,
        content: messageTable.content,
        channelId: messageTable.channelId,
      })
      .from(messageTable)
      .where(eq(messageTable.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error("Message not found");
    }

    const attachments = message.attachments ? JSON.parse(message.attachments) : [];
    let updated = false;

    // Update voice attachment metadata
    for (const attachment of attachments) {
      const metadata = attachment.metadata ? JSON.parse(attachment.metadata) : {};
      if (metadata.isVoiceMessage) {
        metadata.transcription = transcription;
        metadata.transcriptionConfidence = confidence;
        metadata.transcriptionUpdatedAt = new Date().toISOString();
        attachment.metadata = JSON.stringify(metadata);
        updated = true;
        break;
      }
    }

    if (!updated) {
      throw new Error("Voice message attachment not found");
    }

    // Update message content with transcription
    await db
      .update(messageTable)
      .set({
        content: transcription,
        attachments: JSON.stringify(attachments),
      })
      .where(eq(messageTable.id, messageId));

    // Emit WebSocket event for real-time transcription update
    try {
      await unifiedWebSocketService.broadcastToChannel(message.channelId, {
        type: "message:transcription_updated",
        data: {
          messageId,
          transcription,
          confidence,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (wsError) {
      logger.error("Error emitting transcription update:", wsError);
    }

    return {
      success: true,
      messageId,
      transcription,
      confidence,
    };
  } catch (error) {
    logger.error("Error updating voice transcription:", error);
    throw new Error("Failed to update voice transcription");
  }
}

// Get media preview for a message attachment
export async function getMediaPreview(messageId: string, attachmentId: string) {
  const db = await getDatabase();
  try {
    const [message] = await db
      .select({
        id: messageTable.id,
        attachments: messageTable.attachments,
      })
      .from(messageTable)
      .where(eq(messageTable.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error("Message not found");
    }

    const attachments = message.attachments ? JSON.parse(message.attachments) : [];
    const attachment = attachments.find((att: any) => att.id === attachmentId);

    if (!attachment) {
      throw new Error("Attachment not found");
    }

    // Generate preview based on file type
    const preview = {
      attachmentId,
      messageId,
      fileName: attachment.name,
      fileSize: attachment.size,
      mimeType: attachment.mimeType,
      url: attachment.url,
      canPreview: false,
      previewData: null as any,
    };

    if (SUPPORTED_IMAGE_TYPES.includes(attachment.mimeType)) {
      preview.canPreview = true;
      preview.previewData = {
        type: "image",
        thumbnailUrl: attachment.url,
        originalUrl: attachment.url,
      };
    } else if (SUPPORTED_VIDEO_TYPES.includes(attachment.mimeType)) {
      preview.canPreview = true;
      preview.previewData = {
        type: "video",
        videoUrl: attachment.url,
        thumbnailUrl: attachment.url.replace(/\.[^/.]+$/, "_thumb.jpg"),
      };
    } else if (SUPPORTED_AUDIO_TYPES.includes(attachment.mimeType)) {
      preview.canPreview = true;
      const metadata = attachment.metadata ? JSON.parse(attachment.metadata) : {};
      preview.previewData = {
        type: "audio",
        audioUrl: attachment.url,
        duration: metadata.duration || 0,
        waveform: metadata.waveform || [],
        isVoiceMessage: metadata.isVoiceMessage || false,
        transcription: metadata.transcription || null,
      };
    } else if (SUPPORTED_DOCUMENT_TYPES.includes(attachment.mimeType)) {
      preview.canPreview = true;
      preview.previewData = {
        type: "document",
        documentUrl: attachment.url,
        canExtractText: attachment.mimeType === 'text/plain',
      };
    }

    return preview;
  } catch (error) {
    logger.error("Error getting media preview:", error);
    throw new Error("Failed to get media preview");
  }
}

// Get supported media types
export function getSupportedMediaTypes() {
  return {
    audio: SUPPORTED_AUDIO_TYPES,
    video: SUPPORTED_VIDEO_TYPES,
    image: SUPPORTED_IMAGE_TYPES,
    document: SUPPORTED_DOCUMENT_TYPES,
    voice: ['audio/webm', 'audio/wav', 'audio/mp3'],
  };
}

