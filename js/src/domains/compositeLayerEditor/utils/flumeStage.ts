/**
 * Helpers to read and drive Flume's canvas ("stage") from outside the library. Flume exposes no
 * imperative pan/zoom API, so zooming dispatches synthetic `wheel` events (the same path the mouse
 * wheel uses) and panning replays the mouse-drag sequence its `Stage` handlers listen for.
 */

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
