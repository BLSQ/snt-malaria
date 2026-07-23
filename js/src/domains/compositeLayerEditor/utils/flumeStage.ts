/**
 * Helpers to read and drive Flume's canvas ("stage") from outside the library. Flume exposes no
 * imperative pan/zoom API, so zooming dispatches synthetic `wheel` events (the same path the mouse
 * wheel uses) and panning replays the mouse-drag sequence its `Stage` handlers listen for.
 */
import { FlumeCommentMap } from 'flume';
import { FlumeGraph } from '../types/flumeGraph';

// Flume clamps each wheel event to a 0.05 scale delta.
export const MAX_SCALE_STEP = 0.05;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 7;

export type StageTransform = {
    scale: number;
    translateX: number;
    translateY: number;
};

export const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

// px of breathing room left around a graph's bounding box when scaling it to fit a viewport -
// shared by the live "fit to content" (CanvasControls) and the pre-computed framing used when a
// graph's final layout is already known before it's ever mounted (see `centerGraph` in
// buildFlumeGraph.ts and its callers in index.tsx).
export const FIT_PADDING = 40;

/** Scale that fits a `boxWidth`x`boxHeight` box into a `viewportWidth`x`viewportHeight` viewport
 * with `FIT_PADDING` of breathing room, never enlarging past 100%. */
export const computeFitScale = (
    boxWidth: number,
    boxHeight: number,
    viewportWidth: number,
    viewportHeight: number,
): number =>
    clamp(
        Math.min(
            (viewportWidth - 2 * FIT_PADDING) / boxWidth,
            (viewportHeight - 2 * FIT_PADDING) / boxHeight,
        ),
        MIN_SCALE,
        1,
    );

// Flume tags every node's root element with this attribute (and its own id as `data-node-id`).
export const NODE_SELECTOR = '[data-flume-component="node"]';

/** The Flume stage element inside the given canvas wrapper, if mounted. */
export const getStageElement = (
    canvas: HTMLElement | null,
): HTMLElement | null =>
    canvas?.querySelector<HTMLElement>('[data-flume-component="stage"]') ??
    null;

/** Read Flume's current stage scale + translate from the transform styles it renders. */
export const readStageTransform = (stage: HTMLElement): StageTransform => {
    const scaleEl = stage.querySelector<HTMLElement>('div[style*="scale("]');
    const translateEl = stage.querySelector<HTMLElement>(
        'div[style*="translate("]',
    );
    const scaleMatch = /scale\(([-0-9.]+)\)/.exec(
        scaleEl?.style.transform ?? '',
    );
    const translateMatch = /translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/.exec(
        translateEl?.style.transform ?? '',
    );
    // Flume renders `translate(${-translate.x}px, ${-translate.y}px)`, so negate to recover it.
    return {
        scale: scaleMatch ? parseFloat(scaleMatch[1]) : 1,
        translateX: translateMatch ? -parseFloat(translateMatch[1]) : 0,
        translateY: translateMatch ? -parseFloat(translateMatch[2]) : 0,
    };
};

export type MeasuredSize = { width: number; height: number };

/** Real rendered size (in stage-space units, i.e. screen px / scale) of every node currently on
 * `stage`, keyed by `data-node-id`. Used to re-lay-out a graph from its actual DOM sizes instead
 * of estimates - see `relayoutWithMeasuredSizes` in buildFlumeGraph.ts. */
export const measureNodeSizes = (stage: HTMLElement): Map<string, MeasuredSize> => {
    const { scale } = readStageTransform(stage);
    const sizes = new Map<string, MeasuredSize>();
    stage.querySelectorAll<HTMLElement>(NODE_SELECTOR).forEach(el => {
        const id = el.dataset.nodeId;
        if (!id) return;
        const rect = el.getBoundingClientRect();
        sizes.set(id, { width: rect.width / scale, height: rect.height / scale });
    });
    return sizes;
};

export type ShiftedGraph = {
    nodes: FlumeGraph;
    comments: FlumeCommentMap;
    scale: number;
};

/**
 * Flume always resets its stage to `scale: 1, translate: {x:0, y:0}` on remount (it has no prop to
 * preserve them - see `NodeEditor.js`). Call this right before remounting to counteract that: it
 * shifts every node/comment by the current pan so they land exactly where they were once translate
 * resets to 0, and returns the current scale to restore via `initialScale` - together making the
 * remount visually a no-op. Returns the graph unchanged (at scale 1) if the stage isn't mounted.
 */
export const shiftGraphForRemount = (
    nodes: FlumeGraph,
    comments: FlumeCommentMap,
    canvas: HTMLElement | null,
): ShiftedGraph => {
    const stage = getStageElement(canvas);
    if (!stage) return { nodes, comments, scale: 1 };

    const { scale, translateX, translateY } = readStageTransform(stage);
    const shiftX = translateX / scale;
    const shiftY = translateY / scale;

    const shiftedNodes: FlumeGraph = {};
    Object.entries(nodes).forEach(([id, node]) => {
        shiftedNodes[id] = {
            ...node,
            x: (node.x ?? 0) - shiftX,
            y: (node.y ?? 0) - shiftY,
        };
    });

    const shiftedComments: FlumeCommentMap = {};
    Object.entries(comments).forEach(([id, comment]) => {
        shiftedComments[id] = {
            ...comment,
            x: (comment.x ?? 0) - shiftX,
            y: (comment.y ?? 0) - shiftY,
        };
    });

    return { nodes: shiftedNodes, comments: shiftedComments, scale };
};

/** Zoom by dispatching synthetic wheel events; negative `deltaY` zooms in. */
export const dispatchWheel = (
    stage: HTMLElement,
    deltaY: number,
    clientX: number,
    clientY: number,
    steps: number,
): void => {
    for (let i = 0; i < steps; i += 1) {
        stage.dispatchEvent(
            new WheelEvent('wheel', {
                deltaY,
                clientX,
                clientY,
                bubbles: true,
                cancelable: true,
            }),
        );
    }
};

/**
 * Simulate a stage pan by replaying the mousedown → (threshold) mousemove → mouseup sequence that
 * Flume's `Draggable` listens for. The resulting `SET_TRANSLATE` adds `dragData.x - finalX` to the
 * current translate, so we choose `finalX/Y` to apply the exact `(dx, dy)` delta we want.
 */
export const dispatchPan = (
    stage: HTMLElement,
    originX: number,
    originY: number,
    dx: number,
    dy: number,
): void => {
    const fire = (
        target: EventTarget,
        type: string,
        clientX: number,
        clientY: number,
    ) =>
        target.dispatchEvent(
            new MouseEvent(type, {
                clientX,
                clientY,
                bubbles: true,
                cancelable: true,
                view: window,
            }),
        );

    // 1. Press on the stage, 2. cross the drag threshold (>6px) so a drag actually starts,
    // 3. release at the point that yields the desired translate delta.
    const dragStartX = originX + 10;
    fire(stage, 'mousedown', originX, originY);
    fire(document, 'mousemove', dragStartX, originY);
    fire(window, 'mouseup', dragStartX - dx, originY - dy);
};
