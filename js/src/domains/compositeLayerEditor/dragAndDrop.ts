import { OperatorNodeType } from './nodeTypeRegistry';

/**
 * MIME type carrying a node-library entry's type when dragged onto the canvas. Kept in its own
 * module so drag source and drop target share it without importing each other, like
 * `dataLayers/dragAndDrop.ts`.
 */
export const COMPOSITE_NODE_TYPE_DND_MIME =
    'application/x-snt-composite-node-type';

export type CompositeNodeLibraryDragType = OperatorNodeType | 'comment';
