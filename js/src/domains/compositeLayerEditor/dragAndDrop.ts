import { OperatorNodeType } from './nodeTypeRegistry';

/**
 * Custom MIME type used to carry a node-library entry's type when dragging it from the sidebar
 * onto the canvas: one of the 4 operator node types, or `'comment'` (a Flume canvas annotation,
 * not a node type). Kept in its own module so both the drag source (node library) and the drop
 * target (`useCanvasDrop`) can share it without pulling in each other's heavier modules - mirrors
 * `dataLayers/dragAndDrop.ts`'s `DATA_LAYER_DND_MIME`.
 */
export const COMPOSITE_NODE_TYPE_DND_MIME =
    'application/x-snt-composite-node-type';

export type CompositeNodeLibraryDragType = OperatorNodeType | 'comment';
