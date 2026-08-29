export interface OutboxEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  attempts: number;
  availableAt: Date;
  createdAt: Date;
  claimedUntil?: Date;
  publishedAt?: Date;
}
