// Mock the DB model so we can force a persistence failure without a database.
jest.mock('../../db/models', () => ({ SubmissionOutput: { findOne: jest.fn() } }));

import { SubmissionOutput } from '../../db/models';
import { NormalizationService } from './service';

const findOne = SubmissionOutput.findOne as unknown as jest.Mock;

describe('NormalizationService failure handling', () => {
  afterEach(() => findOne.mockReset());

  it('returns a structured {ok:false} failure when persistence throws (no bare 500)', async () => {
    findOne.mockRejectedValue(new Error('db down'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res: any = await new NormalizationService().process({
      submission: { id: 1 },
      extraction: { structuredData: { riskType: 'wind' } },
    });

    expect(res).toMatchObject({ ok: false, service: 'normalization', code: 'STAGE_ERROR' });
    expect(String(res.error)).toContain('db down');
    spy.mockRestore();
  });

  it('still succeeds when there is no submission id (no persistence attempted)', async () => {
    const res: any = await new NormalizationService().process({ extraction: { structuredData: { riskType: 'wind' } } });
    expect(res).toMatchObject({ ok: true, service: 'normalization' });
    expect(findOne).not.toHaveBeenCalled();
  });
});
