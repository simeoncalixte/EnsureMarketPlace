import { SchemaOptionSet, SchemaOptionSetItem } from '../db/models/schemaOptionSets.models';

/**
 * FieldOptionsService — resolves and mutates tenant-overridable picklists
 * (`schema_option_sets`) using the multi-tenant **overlay** model:
 *
 *   resolved = (global default items − tenant-hidden) ⊕ tenant-added items
 *
 * A tenant never copies the whole set: it stores only its delta (added item rows
 * on a tenant-owned set + a `hiddenValues` list of suppressed global values). So
 * improvements to a global default still reach every tenant that hasn't hidden
 * the affected item. Stable `value` codes are the identity; labels are display.
 */

export type OptionItemScope = 'global' | 'tenant';
export type ResolvedItem = { value: string; label: string; scope: OptionItemScope; hidden: boolean };
export type ResolvedOptionSet = {
  optionSetKey: string;
  label: string | null;
  /** Visible items for a <select> (hidden globals removed, tenant items appended). */
  items: Array<{ value: string; label: string }>;
  /** Every item incl. hidden/scope — for the picklist manager UI. */
  allItems: ResolvedItem[];
};

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'option'
  );
}

export class FieldOptionsService {
  private loadSet(optionSetKey: string, organizationId: number | null) {
    return SchemaOptionSet.findOne({
      where: { optionSetKey, organizationId },
      include: [{ model: SchemaOptionSetItem, as: 'items' }],
      order: [[{ model: SchemaOptionSetItem, as: 'items' }, 'order', 'ASC']],
    });
  }

  private itemsOf(set: SchemaOptionSet | null): SchemaOptionSetItem[] {
    return ((set?.get('items') as SchemaOptionSetItem[] | undefined) ?? []);
  }

  private hiddenOf(set: SchemaOptionSet | null): Set<string> {
    return new Set<string>((set?.get('hiddenValues') as string[] | undefined) ?? []);
  }

  /** Merge the global default with the tenant overlay into a resolved set. */
  async resolve(organizationId: number, optionSetKey: string): Promise<ResolvedOptionSet> {
    const [globalSet, tenantSet] = await Promise.all([
      this.loadSet(optionSetKey, null),
      this.loadSet(optionSetKey, organizationId),
    ]);

    const hidden = this.hiddenOf(tenantSet);
    const tenantItems = this.itemsOf(tenantSet);
    const tenantValues = new Set(tenantItems.map((i) => i.value));

    const all: ResolvedItem[] = [];
    for (const it of this.itemsOf(globalSet)) {
      // A tenant item with the same value overrides the global label below.
      if (tenantValues.has(it.value)) continue;
      all.push({ value: it.value, label: it.label, scope: 'global', hidden: hidden.has(it.value) });
    }
    for (const it of tenantItems) {
      all.push({ value: it.value, label: it.label, scope: 'tenant', hidden: false });
    }

    const items = all.filter((i) => !i.hidden).map(({ value, label }) => ({ value, label }));
    const label = tenantSet?.label ?? globalSet?.label ?? null;
    return { optionSetKey, label, items, allItems: all };
  }

  private async ensureTenantSet(organizationId: number, optionSetKey: string): Promise<SchemaOptionSet> {
    const [set] = await SchemaOptionSet.findOrCreate({
      where: { organizationId, optionSetKey },
      defaults: { organizationId, optionSetKey, label: null, source: 'human' } as never,
    });
    return set;
  }

  /** Add a tenant-defined item (copy-on-write: creates the tenant set on first edit). */
  async addItem(organizationId: number, optionSetKey: string, label: string, value?: string): Promise<ResolvedOptionSet> {
    const clean = label.trim();
    if (!clean) throw new Error('label_required');

    const resolved = await this.resolve(organizationId, optionSetKey);

    // Restore path: an explicit value matching a currently-hidden global default
    // un-hides it instead of creating a duplicate code.
    if (value) {
      const match = resolved.allItems.find((i) => i.value === value);
      if (match && match.scope === 'global' && match.hidden) {
        const set = await this.ensureTenantSet(organizationId, optionSetKey);
        await this.setHidden(set, value, false);
        return this.resolve(organizationId, optionSetKey);
      }
    }

    const set = await this.ensureTenantSet(organizationId, optionSetKey);

    // Generate a stable, unique value across the merged set.
    const taken = new Set(resolved.allItems.map((i) => i.value));
    const base = (value && value.trim()) || slugify(clean);
    let v = base;
    let n = 1;
    while (taken.has(v)) v = `${base}_${++n}`;

    const maxOrder = (await SchemaOptionSetItem.max('order', { where: { optionSetId: set.id } })) as number | null;
    await SchemaOptionSetItem.create({
      optionSetId: set.id,
      value: v,
      label: clean,
      order: (Number(maxOrder) || 0) + 1,
    });

    // Re-adding a value that was previously hidden should make it visible again.
    await this.setHidden(set, v, false);
    return this.resolve(organizationId, optionSetKey);
  }

  /**
   * Remove an item: a tenant-owned item is deleted outright; a global default item
   * is *hidden* for this tenant (overlay), never touching the shared global row.
   */
  async removeItem(organizationId: number, optionSetKey: string, value: string): Promise<ResolvedOptionSet> {
    const tenantSet = await this.loadSet(optionSetKey, organizationId);
    const tenantItem = this.itemsOf(tenantSet).find((i) => i.value === value);
    if (tenantItem) {
      await tenantItem.destroy();
      return this.resolve(organizationId, optionSetKey);
    }
    const set = tenantSet ?? (await this.ensureTenantSet(organizationId, optionSetKey));
    await this.setHidden(set, value, true);
    return this.resolve(organizationId, optionSetKey);
  }

  private async setHidden(set: SchemaOptionSet, value: string, hidden: boolean): Promise<void> {
    const current = new Set<string>((set.get('hiddenValues') as string[] | undefined) ?? []);
    const changed = hidden ? !current.has(value) && (current.add(value), true) : current.delete(value);
    if (changed) {
      set.set('hiddenValues', Array.from(current));
      await set.save();
    }
  }
}
