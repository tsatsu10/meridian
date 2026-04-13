import { EventEmitter } from "node:events";
import logger from '../utils/logger';

const EVENTS = new EventEmitter();
EVENTS.setMaxListeners(100);

export type EventPayload<T = unknown> = {
  type: string;
  data: T;
  timestamp: string;
};

export async function shutdownEventBus(): Promise<void> {
  EVENTS.removeAllListeners();
}

export async function publishEvent(
  eventType: string,
  data: unknown,
): Promise<void> {
  const payload: EventPayload = {
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  };

  try {
    EVENTS.emit(eventType, payload);
  } catch (error) {
    logger.error("Failed to publish event:", error);
    throw error;
  }
}

export async function subscribeToEvent<T>(
  eventType: string,
  handler: (data: T) => Promise<void>,
): Promise<void> {
  try {
    EVENTS.on(eventType, async (payload: EventPayload<T>) => {
      try {
        await handler(payload.data);
      } catch (error) {
        logger.error(`Error processing event ${eventType}:`, error);
      }
    });
  } catch (error) {
    logger.error("Failed to subscribe to event:", error);
    throw error;
  }
}

process.on("SIGTERM", () => {
  shutdownEventBus().catch(console.error);
});

