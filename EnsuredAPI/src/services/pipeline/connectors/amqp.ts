/**
 * Lightweight RabbitMQ (AMQP) connector wrapper.
 * Uses dynamic import of `amqplib` so the module is only required when used.
 */
let amqplib: any;

async function loadLib() {
  if (!amqplib) amqplib = await import('amqplib');
  return amqplib;
}

class AmqpConnector {
  private connection: any | null = null;
  private channel: any | null = null;
  private url: string;

  constructor(url?: string) {
    this.url = url ?? process.env.AMQP_URL ?? 'amqp://localhost';
  }

  async connect() {
    if (this.channel && this.connection) return;
    const lib = await loadLib();
    this.connection = await lib.connect(this.url);
    this.connection.on?.('error', (err: any) => {
      // keep connection null so next ensureConnected will reconnect
      console.error('AMQP connection error:', err?.message ?? err);
      this.connection = null;
      this.channel = null;
    });
    this.connection.on?.('close', () => {
      console.warn('AMQP connection closed');
      this.connection = null;
      this.channel = null;
    });
    this.channel = await this.connection.createChannel();
  }

  private async ensureConnected() {
    if (!this.channel || !this.connection) await this.connect();
  }

  async assertQueue(queue: string, opts: any = { durable: true }) {
    await this.ensureConnected();
    return this.channel.assertQueue(queue, opts);
  }

  async publishToQueue(queue: string, payload: unknown, opts: any = {}) {
    await this.assertQueue(queue);
    const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload));
    return this.channel.sendToQueue(queue, buf, { persistent: true, ...opts });
  }

  async consumeQueue(queue: string, onMessage: (body: any, rawMsg: any) => Promise<void>, opts: any = {}) {
    await this.assertQueue(queue);
    return this.channel.consume(
      queue,
      async (msg: any) => {
        if (!msg) return;
        let body: any;
        try {
          body = JSON.parse(msg.content.toString());
        } catch (_) {
          body = msg.content.toString();
        }
        try {
          await onMessage(body, msg);
          this.channel.ack(msg);
        } catch (err) {
          console.error('AMQP message handler error:', err?.message ?? err);
          try {
            this.channel.nack?.(msg, false, false);
          } catch (e) {}
        }
      },
      { noAck: false, ...opts }
    );
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
    } catch (e) {}
    try {
      if (this.connection) await this.connection.close();
    } catch (e) {}
    this.channel = null;
    this.connection = null;
  }
}

export const amqpConnector = new AmqpConnector();
