import {
  getStrategyForChannel,
  registerIngestionStrategy,
  type IngestionStrategy,
} from './strategies';

function channelOf(type: string): { get(key: string): unknown } {
  return { get: (key) => (key === 'type' ? type : undefined) };
}

describe('ingestion strategy registry', () => {
  it('keeps built-in aliases mapped to the same registered transport', () => {
    expect(getStrategyForChannel(channelOf('gmail') as never).constructor.name).toBe('EmailStrategy');
    expect(getStrategyForChannel(channelOf('rabbitmq') as never).constructor.name).toBe('AmqpStrategy');
  });

  it('accepts a new channel type without changing the selector', () => {
    const custom: IngestionStrategy = { ensureSubmissions: async () => 42 };
    registerIngestionStrategy(['webhook-test'], () => custom);

    expect(getStrategyForChannel(channelOf('webhook-test') as never)).toBe(custom);
  });
});
