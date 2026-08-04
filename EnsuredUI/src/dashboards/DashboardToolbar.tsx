import React from "react";
import {
  Toolbar as HostToolbar,
  Spacer,
  SourceTag,
  ScopeSwitch,
  ScopeButton,
  StatusText,
} from "../xds/components/DashboardHost";
import Button from "../xds/components/Button";

type Props = {
  editing: boolean;
  isAdmin: boolean;
  scope: "user" | "org";
  showAdd: boolean;
  addableCount: number;
  error?: string | null;
  busy: boolean;
  sourceLabel: string;
  beginEdit: (s: "user" | "org") => void;
  setShowAdd: React.Dispatch<React.SetStateAction<boolean>>;
  reset: () => void;
  cancelEdit: () => void;
  save: () => void;
};

export default function DashboardToolbar({
  editing,
  isAdmin,
  scope,
  showAdd,
  addableCount,
  error,
  busy,
  sourceLabel,
  beginEdit,
  setShowAdd,
  reset,
  cancelEdit,
  save,
}: Props) {
  const addCountSuffix = addableCount ? ` (${addableCount})` : "";
  const addButtonLabel = showAdd ? "Close" : `Add widget${addCountSuffix}`;
  const resetLabel = scope === "org" ? "Reset to platform" : "Reset to default";

  return (
    <HostToolbar>
      {!editing ? (
        <>
          <SourceTag>{sourceLabel}</SourceTag>
          <Spacer />
          <Button variant="outline" size="sm" onClick={() => beginEdit("user")}>Customize</Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => beginEdit("org")}>
              Edit org default
            </Button>
          )}
        </>
      ) : (
        <>
          {isAdmin ? (
            <ScopeSwitch role="group" aria-label="Editing scope">
              <ScopeButton type="button" $active={scope === "user"} onClick={() => beginEdit("user")}>My dashboard</ScopeButton>
              <ScopeButton type="button" $active={scope === "org"} onClick={() => beginEdit("org")}>Organization default</ScopeButton>
            </ScopeSwitch>
          ) : (
            <SourceTag>Editing your layout</SourceTag>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowAdd((s) => !s)}>{addButtonLabel}</Button>
          <Spacer />
          {error && <StatusText $error>{error}</StatusText>}
          <Button variant="text" size="sm" onClick={reset} disabled={busy}>{resetLabel}</Button>
          <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={busy}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </>
      )}
    </HostToolbar>
  );
}
