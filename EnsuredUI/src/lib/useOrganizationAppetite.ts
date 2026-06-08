import { useState, useEffect, useCallback } from 'react';
import {
  getAppetite,
  saveAppetite,
  createAppetiteRule,
  updateAppetiteRule,
  deleteAppetiteRule,
  readAppetiteRuleError,
} from '../api/organizations';

// Request/response shapes now live with the API module; re-exported here so
// existing importers (e.g. AppetiteSettings) keep their import paths.
export type {
  AppetiteSeverity,
  AppetiteProfile,
  ValidationRule,
  AppetiteProfilePatch,
  ValidationRuleInput,
} from '../api/organizations';
import type { AppetiteProfile, ValidationRule, AppetiteProfilePatch, ValidationRuleInput } from '../api/organizations';

export interface UseOrganizationAppetiteResult {
  profile: AppetiteProfile | null;
  rules: ValidationRule[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveProfile: (patch: AppetiteProfilePatch) => Promise<void>;
  createRule: (input: ValidationRuleInput) => Promise<void>;
  updateRule: (id: number, input: ValidationRuleInput) => Promise<void>;
  deleteRule: (id: number) => Promise<void>;
}

export function useOrganizationAppetite(organizationId?: number | null): UseOrganizationAppetiteResult {
  const [profile, setProfile] = useState<AppetiteProfile | null>(null);
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAppetite(organizationId);
      setProfile(data);
      setRules(Array.isArray(data.rules) ? data.rules : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveProfile = useCallback(
    async (patch: AppetiteProfilePatch) => {
      if (!organizationId) return;
      setSaving(true);
      setError(null);
      try {
        const data = await saveAppetite(organizationId, patch);
        setProfile(data);
        setRules(Array.isArray(data.rules) ? data.rules : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [organizationId],
  );

  const createRule = useCallback(
    async (input: ValidationRuleInput) => {
      if (!organizationId) return;
      setError(null);
      const res = await createAppetiteRule(organizationId, input);
      if (!res.ok) {
        const message = await readAppetiteRuleError(res, 'Failed to create rule');
        setError(message);
        throw new Error(message);
      }
      const data: ValidationRule = await res.json();
      setRules((prev) => [...prev, data]);
    },
    [organizationId],
  );

  const updateRule = useCallback(
    async (id: number, input: ValidationRuleInput) => {
      if (!organizationId) return;
      setError(null);
      const res = await updateAppetiteRule(organizationId, id, input);
      if (!res.ok) {
        const message = await readAppetiteRuleError(res, 'Failed to update rule');
        setError(message);
        throw new Error(message);
      }
      const data: ValidationRule = await res.json();
      setRules((prev) => prev.map((r) => (r.id === id ? data : r)));
    },
    [organizationId],
  );

  const deleteRule = useCallback(
    async (id: number) => {
      if (!organizationId) return;
      await deleteAppetiteRule(organizationId, id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    },
    [organizationId],
  );

  return { profile, rules, loading, saving, error, reload, saveProfile, createRule, updateRule, deleteRule };
}
