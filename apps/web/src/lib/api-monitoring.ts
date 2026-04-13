
export const withApiMonitoring = async <T>(
  apiCall: () => Promise<T>,
  apiName: string
): Promise<T> => {
  const startTime = performance.now();
  try {
    const result = await apiCall();
    const endTime = performance.now();
    const duration = endTime - startTime;
    logger.info("API call ${apiName} took ${duration.toFixed(2)}ms to complete.");
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.error(`API call ${apiName} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};
