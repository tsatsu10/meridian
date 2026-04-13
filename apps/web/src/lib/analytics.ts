
export const trackEvent = (eventName: string, eventProperties: Record<string, any>) => {
  logger.info("[Analytics Event] ${eventName}");
};
