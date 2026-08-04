import React from 'react';
import { Root, Header, Title, HeaderActions, IconButton, RemoveButton, Body } from '../xds/components/WidgetFrame'

// Chrome drawn around every dashboard widget: a header (which doubles as the
// drag handle in edit mode) and the widget body. The header carries the class
// `widget-drag-handle` that react-grid-layout is told to use as its drag handle,
// so dragging is limited to the header and the body stays interactive.

// Styled pieces are provided by the XDS package: `src/xds/components/WidgetFrame`

export type WidgetFrameProps = {
  title: string;
  editing: boolean;
  /** Show the gear (⚙) when the widget exposes configurable settings. */
  configurable?: boolean;
  onConfigure?: () => void;
  onRemove?: () => void;
  children: React.ReactNode;
};

export default function WidgetFrame({ title, editing, configurable, onConfigure, onRemove, children }: WidgetFrameProps) {
  return (
    <Root $editing={editing}>
      <Header className={editing ? 'widget-drag-handle' : undefined} $editing={editing}>
        <Title>{title}</Title>
        {editing && (
          // Stop mousedown from reaching the grid's drag handle so the buttons stay clickable.
          <HeaderActions onMouseDown={(e) => e.stopPropagation()}>
            {configurable && onConfigure && (
              <IconButton type="button" aria-label={`Configure ${title}`} onClick={onConfigure}>
                ⚙
              </IconButton>
            )}
            {onRemove && (
              <RemoveButton type="button" aria-label={`Remove ${title}`} onClick={onRemove}>
                ×
              </RemoveButton>
            )}
          </HeaderActions>
        )}
      </Header>
      <Body>{children}</Body>
    </Root>
  );
}
