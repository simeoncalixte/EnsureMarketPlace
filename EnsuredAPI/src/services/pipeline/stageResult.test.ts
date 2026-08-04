import { runStage, stageFailure, errorMessage, STAGE_ERROR_CODE } from './stageResult';

describe('stageResult', () => {
  it('errorMessage extracts a string from Error / string / object', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('nope')).toBe('nope');
    expect(errorMessage({ a: 1 })).toBe('{"a":1}');
  });

  it('stageFailure builds the structured failure shape', () => {
    expect(stageFailure('ocr', new Error('x'))).toEqual({ ok: false, service: 'ocr', error: 'x', code: STAGE_ERROR_CODE });
    expect(stageFailure('ocr', new Error('x'), 'CUSTOM').code).toBe('CUSTOM');
  });

  it('runStage passes a successful result through unchanged', async () => {
    const result = await runStage('svc', async () => ({ ok: true, service: 'svc', value: 1 }));
    expect(result).toEqual({ ok: true, service: 'svc', value: 1 });
  });

  it('runStage converts a thrown error into a structured failure', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await runStage('svc', async () => {
      throw new Error('db down');
    });
    expect(result).toEqual({ ok: false, service: 'svc', error: 'db down', code: STAGE_ERROR_CODE });
    spy.mockRestore();
  });
});
