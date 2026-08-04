jest.mock('../db/models/schemaOptionSets.models', () => ({
  SchemaOptionSet: { findOne: jest.fn(), findOrCreate: jest.fn() },
  SchemaOptionSetItem: { create: jest.fn(), max: jest.fn() },
}));

import { SchemaOptionSet, SchemaOptionSetItem } from '../db/models/schemaOptionSets.models';
import { FieldOptionsService } from './FieldOptionsService';

const setFindOne = SchemaOptionSet.findOne as unknown as jest.Mock;
const setFindOrCreate = SchemaOptionSet.findOrCreate as unknown as jest.Mock;
const itemCreate = SchemaOptionSetItem.create as unknown as jest.Mock;
const itemMax = SchemaOptionSetItem.max as unknown as jest.Mock;

type FakeItem = { value: string; label: string; destroy: jest.Mock; get: (k: string) => unknown };
const makeItem = (value: string, label: string, source: 'ai' | 'human' = 'ai'): FakeItem => ({
  value,
  label,
  destroy: jest.fn(),
  get: (k: string) => (k === 'source' ? source : undefined),
});

const makeSet = (items: FakeItem[], hidden: string[] = []) => {
  const state = { hiddenValues: hidden };
  return {
    id: 7,
    label: 'Cargo Type',
    items,
    get: (k: string) => (k === 'items' ? items : k === 'hiddenValues' ? state.hiddenValues : undefined),
    set: jest.fn((k: string, v: unknown) => {
      if (k === 'hiddenValues') state.hiddenValues = v as string[];
    }),
    save: jest.fn(),
    _state: state,
  };
};

// findOne resolves the global (org null) or tenant (org id) set by the where clause.
function wireSets(globalSet: unknown, tenantSet: unknown) {
  setFindOne.mockImplementation(({ where }: { where: { organizationId: number | null } }) =>
    Promise.resolve(where.organizationId === null ? globalSet : tenantSet),
  );
}

beforeEach(() => {
  setFindOne.mockReset();
  setFindOrCreate.mockReset();
  itemCreate.mockReset().mockResolvedValue({});
  itemMax.mockReset().mockResolvedValue(3);
});

describe('FieldOptionsService.addItem', () => {
  it('writes a user-added item with source "human" so it survives AI regeneration', async () => {
    const tenant = makeSet([makeItem('bulk', 'Bulk', 'ai')]);
    wireSets(null, tenant);
    setFindOrCreate.mockResolvedValue([tenant, false]);

    await new FieldOptionsService().addItem(4, 'ocean-marine.cargo-details.cargoType', 'Refrigerated');

    expect(itemCreate).toHaveBeenCalledTimes(1);
    const arg = itemCreate.mock.calls[0][0];
    expect(arg).toMatchObject({ optionSetId: 7, label: 'Refrigerated', source: 'human' });
    expect(arg.value).toBe('refrigerated'); // slugified, unique
  });

  it('de-duplicates the generated value against existing items', async () => {
    const tenant = makeSet([makeItem('refrigerated', 'Refrigerated', 'human')]);
    wireSets(null, tenant);
    setFindOrCreate.mockResolvedValue([tenant, false]);

    await new FieldOptionsService().addItem(4, 'k', 'Refrigerated');

    expect(itemCreate.mock.calls[0][0].value).toBe('refrigerated_2');
  });
});

describe('FieldOptionsService.removeItem', () => {
  it('destroys a user-added (human) item outright', async () => {
    const human = makeItem('refrigerated', 'Refrigerated', 'human');
    const tenant = makeSet([human]);
    wireSets(null, tenant);

    await new FieldOptionsService().removeItem(4, 'k', 'refrigerated');

    expect(human.destroy).toHaveBeenCalledTimes(1);
    expect(tenant.save).not.toHaveBeenCalled(); // not hidden — actually removed
  });

  it('hides (does not destroy) an AI baseline item so it does not reappear on regen', async () => {
    const ai = makeItem('bulk', 'Bulk', 'ai');
    const tenant = makeSet([ai]);
    wireSets(null, tenant);

    await new FieldOptionsService().removeItem(4, 'k', 'bulk');

    expect(ai.destroy).not.toHaveBeenCalled();
    expect(tenant.save).toHaveBeenCalledTimes(1);
    expect(tenant._state.hiddenValues).toContain('bulk');
  });
});

describe('FieldOptionsService.resolve', () => {
  it('omits hidden items from the visible list but keeps them in allItems with source', async () => {
    const tenant = makeSet([makeItem('bulk', 'Bulk', 'ai'), makeItem('refrigerated', 'Refrigerated', 'human')], ['bulk']);
    wireSets(null, tenant);

    const resolved = await new FieldOptionsService().resolve(4, 'k');

    expect(resolved.items.map((i) => i.value)).toEqual(['refrigerated']); // 'bulk' hidden
    const bulk = resolved.allItems.find((i) => i.value === 'bulk')!;
    expect(bulk).toMatchObject({ hidden: true, source: 'ai' });
    expect(resolved.allItems.find((i) => i.value === 'refrigerated')).toMatchObject({ source: 'human' });
  });
});
