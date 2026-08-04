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

jest.mock('../../../db/models', () => {
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

import { createPipelineTransformationReporter } from '../../../../test/helpers/pipelineTransformations';
import { IngestionService } from './service';

describe('IngestionService AMQP wiring', () => {
  const transformations = createPipelineTransformationReporter('ingestion-amqp');

  afterAll(async () => {
    await transformations.write();
  });

  test('startAmqpListener registers consumer and processes messages', async () => {
    const amqpModule = require('../connectors/amqp');
    const service = new IngestionService();
    const res = await service.startAmqpListenerForChannel(1);
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toHaveProperty('consumerTag', 'ctag');

    const handler = amqpModule.amqpConnector.__getSavedHandler();
    expect(typeof handler).toBe('function');

    const spy = jest.spyOn(service, 'process').mockResolvedValue({ ok: true });

    const message = { submission: { id: 42 } };
    await handler(message, {});

    transformations.record({
      stage: 'amqp-consume',
      testName: 'startAmqpListener registers consumer and processes messages',
      description: 'AMQP delivery is transformed into a channel-tagged ingestion process call.',
      before: { queueConfig: { queueNames: ['test-queue'] }, message },
      after: { processCall: spy.mock.calls[0] },
    });

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
    const firstDelivery = { submission: { id: 99 } };
    await handler(firstDelivery, {});

    // advance timers to allow scheduled retry (baseBackoffMs = 10)
    jest.advanceTimersByTime(20);

    // it should have published a retry message to the original queue with _ingestionAttempts:1
    expect(amqpModule.amqpConnector.publishToQueue).toHaveBeenCalledWith('test-queue', expect.objectContaining({ _ingestionAttempts: 1 }));

    // simulate re-delivery of the retried message (attempts = 1) which will exceed maxRetries=1
    const retriedDelivery = { submission: { id: 99 }, _ingestionAttempts: 1 };
    await handler(retriedDelivery, {});

    transformations.record({
      stage: 'amqp-retry-dlq',
      testName: 'retries failed messages and sends to DLQ after max retries',
      description: 'Failed AMQP deliveries are transformed into retry and dead-letter queue publish calls.',
      before: {
        firstDelivery,
        retriedDelivery,
        retryPolicy: { maxRetries: 1, baseBackoffMs: 10, deadLetterQueue: 'dead-queue' },
      },
      after: {
        publishCalls: amqpModule.amqpConnector.publishToQueue.mock.calls,
      },
    });

    // DLQ publish should have occurred
    expect(amqpModule.amqpConnector.publishToQueue).toHaveBeenCalledWith('dead-queue', expect.objectContaining({ _ingestionAttempts: 2 }));

    jest.useRealTimers();
  });
});
