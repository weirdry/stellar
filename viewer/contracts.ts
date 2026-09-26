import type catalog from '../assets/viewer/locales/en.json';
export type MessageKey = keyof typeof catalog;
export type MessageValues = Record<string, string | number>;
import type { StellarWorkMap } from '../types/generated/work-map.d.ts';

export type WorkMap = StellarWorkMap;
export type Issue = WorkMap['issues'][number];
export type Source = WorkMap['sources'][number];
export type Relation = WorkMap['relations'][number];
export type Scope = WorkMap['view']['initialScope'];
export type EdgeKind = Relation['kind'] | 'classification';
export type NodeKind = 'domain' | 'category' | 'issue';
export interface ViewerIssue extends Omit<Issue, 'status'> {
  status: string;
  statusType: Issue['status']['type'];
  category: string | undefined;
  domain: string | undefined;
  domainLabel: string | undefined;
  group: string | undefined;
  classificationBasis: string | undefined;
  parentId: string | undefined;
}
export interface Point {
  x: number;
  y: number;
}
export interface Transform extends Point {
  k: number;
}
export interface Box extends Point {
  width: number;
  height: number;
  id?: string;
}
export interface SceneNodeBase extends Point {
  id: string;
  key: string;
  label: string;
  subtitle: string;
  domain: string | undefined;
  category?: string | undefined;
  ghost?: boolean;
}
export type SceneNode =
  | (SceneNodeBase & { type: 'domain'; count: number | null })
  | (SceneNodeBase & { type: 'category'; count: number | null })
  | (SceneNodeBase & {
      type: 'issue';
      center: boolean;
      ghost: boolean;
      status: Issue['status']['type'];
      issue: ViewerIssue;
    });
export interface SceneEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  actual: Relation[];
}
export interface Scene {
  nodes: SceneNode[];
  edges: SceneEdge[];
}
export interface Selection {
  type: NodeKind;
  id: string;
}
export interface Navigation {
  mode: 'global' | 'local';
  selected: Selection | null;
  scope: Scope;
  target: string;
  openDomains: string[];
  openCats: string[];
  treeDomains: string[];
  treeCats: string[];
  transform: Transform;
}
export interface ViewerState extends Omit<
  Navigation,
  'openDomains' | 'openCats' | 'treeDomains' | 'treeCats'
> {
  openDomains: Set<string>;
  openCats: Set<string>;
  treeDomains: Set<string>;
  treeCats: Set<string>;
  visibleEdges: Set<EdgeKind>;
  history: Navigation[];
  scene: Scene;
  edgeSelection: SceneEdge | null;
}
export interface ViewerSnapshot extends Pick<
  Navigation,
  'mode' | 'selected' | 'scope' | 'target' | 'transform'
> {
  baseCount: number;
  baseIds: string[];
  nodes: (Pick<SceneNode, 'id' | 'type' | 'key' | 'x' | 'y'> & {
    ghost: boolean;
  })[];
  edges: SceneEdge[];
}
declare global {
  interface Window {
    stellar: { getState(): ViewerSnapshot };
  }
}
