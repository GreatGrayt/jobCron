import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CRON_SECRET } from "@/config/constants";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateEnvironmentVariables(): void {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new ValidationError("TELEGRAM_BOT_TOKEN is not set in environment variables");
  }

  if (!TELEGRAM_CHAT_ID) {
    throw new ValidationError("TELEGRAM_CHAT_ID is not set in environment variables");
  }
}

export function verifyCronRequest(authHeader: string | null): boolean {
  // If CRON_SECRET is not set, allow all requests (development mode)
  if (!CRON_SECRET) {
    return true;
  }

  // Verify the authorization header matches the secret
  return authHeader === `Bearer ${CRON_SECRET}`;
}
