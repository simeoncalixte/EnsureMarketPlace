/* eslint-env jest */
jest.mock('../connectors/amqp', () => {
  let savedHandler: any = null;
  const amqp = {
    consumeQueue: jest.fn(async (queue: string, handler: any) => {
      savedHandler = handler;
      return { consumerTag: 'ctag' };
    }),
    publishToQueue: jest.fn(async () => true),
    close: jest.fn(async () => true),
    __getSavedHandler: () => savedHandler,
  } as any;
  return { amqpConnector: amqp };
});

jest.mock('../../db/models', () => {
  const SubmissionFile = { findAll: jest.fn(async () => []) };
  const IngestionChannel = {
    findByPk: jest.fn(async (id: number) => ({
      id,
      get: (k: string) => {
        if (k === 'config') return { queueNames: ['test-queue'], maxRetries: 1, baseBackoffMs: 10, deadLetterQueue: 'dead-queue' };
        if (k === 'meta') return null;
        if (k === 'type') return 'rabbitmq';
        return null;
      },
      update: jest.fn(async () => {}),
      toJSON: () => ({ id, config: { queueNames: ['test-queue'] } }),
    })),
  };
  return { SubmissionFile, IngestionChannel };
});

import { IngestionService } from './service';

describe('IngestionService AMQP wiring', () => {
  test('startAmqpListener registers consumer and processes messages', async () => {
    const amqpModule = require('../connectors/amqp');
    const service = new IngestionService();
    const res = await service.startAmqpListenerForChannel(1);
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toHaveProperty('consumerTag', 'ctag');

    const handler = amqpModule.amqpConnector.__getSavedHandler();
    expect(typeof handler).toBe('function');

    const spy = jest.spyOn(service, 'process').mockResolvedValue({ ok: true });

    await handler({ submission: { id: 42 } }, {});

    expect(spy).toHaveBeenCalledWith({ submission: { id: 42 }, _ingestionChannelId: 1 });

    await service.stopAmqpListenerForChannel(1);
  });

  test('retries failed messages and sends to DLQ after max retries', async () => {
    jest.useFakeTimers();
    const amqpModule = require('../connectors/amqp');
    const service = new IngestionService();

    // make process throw for two attempts
    const spy = jest.spyOn(service, 'process').mockRejectedValue(new Error('boom'));

    await service.startAmqpListenerForChannel(1);
    const handler = amqpModule.amqpConnector.__getSavedHandler();

    // first delivery, no attempts
    await handler({ submission: { id: 99 } }, {});

    // advance timers to allow scheduled retry (baseBackoffMs = 10)
    jest.advanceTimersByTime(20);

    // it should have published a retry message to the original queue with _ingestionAttempts:1
    expect(amqpModule.amqpConnector.publishToQueue).toHaveBeenCalledWith('test-queue', expect.objectContaining({ _ingestionAttempts: 1 }));

    // simulate re-delivery of the retried message (attempts = 1) which will exceed maxRetries=1
    await handler({ submission: { id: 99 }, _ingestionAttempts: 1 }, {});

    // DLQ publish should have occurred
    expect(amqpModule.amqpConnector.publishToQueue).toHaveBeenCalledWith('dead-queue', expect.objectContaining({ _ingestionAttempts: 2 }));

    jest.useRealTimers();
  });
});
