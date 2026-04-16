const RETRYABLE_STATUS_CODES = [429, 500, 529];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function completeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      const status = error?.status ?? error?.response?.status;
      if (!RETRYABLE_STATUS_CODES.includes(status) || attempt === maxRetries) {
        throw error;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
