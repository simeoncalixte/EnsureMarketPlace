/** Shared data model for the call-graph analyzer and viewer. */

export type NodeKind = 'function' | 'method' | 'entity' | 'route';

export type EdgeKind = 'calls' | 'uses';

export interface GraphNode {
  /** Stable identifier: "<relative file>#<qualified name>". */
  id: string;
  /** Display name, e.g. "signUserToken", "UserService.create", "POST /auth/login". */
  name: string;
  kind: NodeKind;
  /** Path relative to the package root, POSIX separators. */
  file: string;
  /** 1-based line of the declaration. */
  line: number;
  /** Owning class name for methods. */
  className?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** "calls" = function invocation; "uses" = entity (Sequelize model) access. */
  kind: EdgeKind;
  /** For "uses" edges: the model operations involved (findAll, create, new, ref, …). */
  labels: string[];
}

export interface GraphStats {
  modules: number;
  functions: number;
  methods: number;
  entities: number;
  routes: number;
  callEdges: number;
  usesEdges: number;
}

export interface CallGraph {
  project: string;
  sourceRoot: string;
  generatedAt: string;
  stats: GraphStats;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
