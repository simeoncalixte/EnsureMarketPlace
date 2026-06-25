import React from 'react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
// recharts applies colors as SVG presentation attributes, which can't resolve
// `var()`; use the concrete-resolving palette (still re-reads on theme change).
import { rawColors as colors } from '../colors';

export interface SankeyChartNode {
  key: string;
  label: string;
  accent: string;
  /** Submission-type code for post-fork lanes (null for the shared trunk). */
  type?: string | null;
  typeLabel?: string | null;
  /** Render the node's count only when true — type lanes share a column, so their
   * differing counts would overdraw; the trunk nodes (one per column) set this. */
  showValue?: boolean;
}

export interface SankeyChartLink {
  source: number;
  target: number;
  value: number;
}

interface Props {
  nodes: SankeyChartNode[];
  links: SankeyChartLink[];
  height?: number;
}

/**
 * recharts injects layout props into the `node` / `link` elements at render
 * time, so every field is optional here (we never construct these ourselves).
 */
/** Min horizontal room each node gets (drives the chart's min-width so the
 * per-node side labels have room and the panel scrolls rather than cramming). */
const COLUMN_WIDTH = 132;

/**
 * Split a stage label into at most two balanced lines so long names ("Pre-bind
 * Compliance", "Location Discovery") stay narrow beside a node. Single words are
 * never split.
 */
function wrapLabel(label: string): string[] {
  if (label.length <= 11) return [label];
  const words = label.split(' ');
  if (words.length === 1) return [label];
  const target = Math.ceil(label.length / 2);
  let first = '';
  let i = 0;
  for (; i < words.length; i++) {
    const next = first ? `${first} ${words[i]}` : words[i];
    if (first && next.length > target) break;
    first = next;
  }
  const second = words.slice(i).join(' ');
  return second ? [first, second] : [first];
}

interface NodeRenderProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  containerWidth?: number;
  payload?: SankeyChartNode & { value?: number };
}

/**
 * Each stage is a coloured bar with its label beside it, at the bar's own
 * vertical centre. Labelling per node (not in a shared top row) is required once
 * the flow splits into per-type lanes: lanes of different lengths put different
 * stages in the same column, so a column no longer maps to a single label. Wide
 * columns (see `minWidth` below) give the side labels room; the rightmost nodes
 * flip their label to the left so it isn't clipped.
 */
function SankeyNode({ x = 0, y = 0, width = 0, height = 0, containerWidth = 0, payload }: NodeRenderProps): React.JSX.Element {
  const accent = payload?.accent ?? colors.primary;
  const lines = wrapLabel(payload?.label ?? payload?.key ?? '');
  const isRight = x > containerWidth - 170;
  const labelX = isRight ? x - 8 : x + width + 8;
  const anchor = isRight ? 'end' : 'start';
  const cy = y + height / 2;
  const showCount = typeof payload?.value === 'number' && payload?.showValue !== false;
  // Centre the label block (and optional count line) on the bar's middle.
  const blockLines = lines.length + (showCount ? 1 : 0);
  const top = cy - ((blockLines - 1) * 12) / 2;
  return (
    <g>
      <rect x={x} y={y} width={width} height={Math.max(2, height)} rx={2} fill={accent} fillOpacity={0.92} />
      <text x={labelX} y={top} textAnchor={anchor} dominantBaseline="middle" fontSize={11} fontWeight={700} fill={colors.onSurfaceStrong}>
        {lines.map((line, index) => (
          <tspan key={line} x={labelX} dy={index === 0 ? 0 : 12}>{line}</tspan>
        ))}
      </text>
      {showCount ? (
        <text x={labelX} y={top + lines.length * 12} textAnchor={anchor} dominantBaseline="middle" fontSize={9} fontWeight={600} fill={colors.onSurfaceVariant}>
          {payload?.value}
        </text>
      ) : null}
    </g>
  );
}

interface LinkRenderProps {
  sourceX?: number;
  sourceY?: number;
  sourceControlX?: number;
  targetX?: number;
  targetY?: number;
  targetControlX?: number;
  linkWidth?: number;
  payload?: { source?: SankeyChartNode; target?: SankeyChartNode; value?: number };
}

function SankeyLink({ sourceX = 0, sourceY = 0, sourceControlX = 0, targetControlX = 0, targetX = 0, targetY = 0, linkWidth = 0, payload }: LinkRenderProps): React.JSX.Element {
  const accent = payload?.source?.accent ?? colors.primary;
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={accent}
      strokeWidth={Math.max(1, linkWidth)}
      strokeOpacity={0.32}
    />
  );
}

/**
 * Sankey flow diagram. Nodes are pipeline stages; links are stage→stage
 * transitions whose width is the number of submissions that made that move.
 * `links` reference nodes by index (source/target).
 */
export default function SankeyChart({ nodes, links, height = 460 }: Props): React.JSX.Element {
  if (!nodes?.length || !links?.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.neutral[400] }}>
        No pipeline flow yet
      </div>
    );
  }

  const tooltipStyle = {
    background: colors.surfacePanel,
    border: `1px solid ${colors.surfaceHigh}`,
    borderRadius: 4,
    fontSize: 11,
    color: colors.onSurfaceStrong,
  };

  // Give every stage a comfortable column so labels never overlap; if that is
  // wider than the panel, the panel scrolls horizontally rather than cramming.
  const minWidth = Math.max(640, nodes.length * COLUMN_WIDTH);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ minWidth, height }}>
        <ResponsiveContainer width="100%" height={height}>
          <Sankey
            data={{ nodes, links }}
            node={<SankeyNode />}
            link={<SankeyLink />}
            nodePadding={26}
            nodeWidth={12}
            margin={{ top: 16, right: 48, bottom: 16, left: 40 }}
          >
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: ValueType | undefined): [string, string] => [`${value ?? 0} submissions`, 'Flow']}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
