import * as amqplib from "amqplib";
import type { Channel, ChannelModel } from "amqplib";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let lastFailureAt: number | null = null;
const failureCooldownMs = 30000;

const QUEUE_NAME = "chat.events";

export const initQueue = async () => {
  if (lastFailureAt && Date.now() - lastFailureAt < failureCooldownMs) {
    return { channel: null, queue: QUEUE_NAME } as any;
  }
  if (channel) return { channel, queue: QUEUE_NAME };
  try {
    connection = await amqplib.connect(env.rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    logger.info("RabbitMQ connected");
    return { channel, queue: QUEUE_NAME };
  } catch (error) {
    lastFailureAt = Date.now();
    logger.error({ error }, "RabbitMQ connection failed");
    return { channel: null, queue: QUEUE_NAME } as any;
  }
};

export const publishEvent = async (event: Record<string, unknown>): Promise<boolean> => {
  try {
    if (lastFailureAt && Date.now() - lastFailureAt < failureCooldownMs) {
      return false;
    }
    if (!channel) {
      await initQueue();
    }
    if (!channel) return false;
    const payload = Buffer.from(JSON.stringify(event));
    channel.sendToQueue(QUEUE_NAME, payload, { persistent: true });
    return true;
  } catch (error) {
    logger.error({ error }, "RabbitMQ publish failed");
    return false;
  }
};

export const consumeEvents = async (onMessage: (event: any) => Promise<void> | void) => {
  if (!channel) {
    await initQueue();
  }
  if (!channel) return;
  await channel.consume(QUEUE_NAME, async (msg: amqplib.ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      await onMessage(event);
      channel?.ack(msg);
    } catch (error) {
      logger.error({ error }, "Failed processing queue event");
      channel?.nack(msg, false, false);
    }
  });
};
