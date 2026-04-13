import { logger } from '../utils/logger';

export function handleApiError(error: unknown) {
  logger.error("API Error:", error);

  if (error instanceof Error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}

