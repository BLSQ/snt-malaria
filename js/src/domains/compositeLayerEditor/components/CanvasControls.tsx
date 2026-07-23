import React, { FC, RefObject, useCallback, useEffect } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';
import {
    clamp,
    computeFitScale,
    dispatchPan,
    dispatchWheel,
    FIT_PADDING,
    getStageElement,
    MAX_SCALE,
    MAX_SCALE_STEP,
    MIN_SCALE,
    NODE_SELECTOR,
    readStageTransform,
} from '../utils/flumeStage';

/**
 * On-canvas zoom (+ / −) and fit-to-content (frame) controls for the Flume node editor.
 *
 * These mirror the SNT leaflet map controls (`ZoomControl` + `ResetZoomControl`) in look and
 * position (bottom-right stack). Flume exposes no imperative pan/zoom API, so the controls drive
 * its own `Stage` handlers through the synthetic-event helpers in `utils/flumeStage.ts`. The frame
 * button pans to centre the nodes' bounding box, then zooms (centred wheel events) to fit it into
 * view; both `Stage` handlers use functional reducer updates, so chaining a drag then wheels
 * within one click stays consistent.
 */

const styles = {
    container: {
        position: 'absolute',
        bottom: theme => theme.spacing(1),
        right: theme => theme.spacing(1),
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        gap: theme => theme.spacing(0.25),
    },
    button: {
        appearance: 'none',
        cursor: 'pointer',
        padding: 0,
        margin: 0,
        border: 'none',
        backgroundColor: theme => alpha(theme.palette.text.primary, 0.75),
        color: 'common.white',
        minWidth: theme => theme.spacing(3.5),
        minHeight: theme => theme.spacing(3.5),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme => `${theme.shape.borderRadius}px`,
        lineHeight: 1,
        '&:hover': {
            backgroundColor: theme => alpha(theme.palette.text.primary, 0.9),
        },
    },
    zoomLabel: {
        fontSize: theme => theme.typography.pxToRem(22),
        transform: 'translateY(-1px)',
    },
} satisfies SxStyles;

type Props = {
    /** Ref to the element wrapping the `<NodeEditor>`. */
    canvasRef: RefObject<HTMLElement>;
};

export const CanvasControls: FC<Props> = ({ canvasRef }) => {
    const { formatMessage } = useSafeIntl();
    const getStage = useCallback(
        () => getStageElement(canvasRef.current),
        [canvasRef],
    );

    const zoom = useCallback(
        (direction: 1 | -1) => {
            const stage = getStage();
            if (!stage) return;

            const rect = stage.getBoundingClientRect();
            const { scale } = readStageTransform(stage);
            const target = clamp(
                scale * (direction === 1 ? 1.3 : 1 / 1.3),
                MIN_SCALE,
                MAX_SCALE,
            );
            const steps = clamp(
                Math.round(Math.abs(target - scale) / MAX_SCALE_STEP),
                1,
                60,
            );
            // Negative deltaY zooms in, positive zooms out. Keep it centred on the stage.
            dispatchWheel(
                stage,
                direction === 1 ? -10 : 10,
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                steps,
            );
        },
        [getStage],
    );

    const fitToNodes = useCallback((align: 'center' | 'right' = 'center') => {
        const stage = getStage();
        if (!stage) return;

        const nodeEls = Array.from(
            stage.querySelectorAll<HTMLElement>(NODE_SELECTOR),
        );
        if (nodeEls.length === 0) return;

        const rect = stage.getBoundingClientRect();
        const { scale, translateX, translateY } = readStageTransform(stage);

        // Convert a screen coordinate into Flume's stage space (origin at stage centre).
        const toStageX = (screenX: number) =>
            (screenX - rect.left - rect.width / 2 + translateX) / scale;
        const toStageY = (screenY: number) =>
            (screenY - rect.top - rect.height / 2 + translateY) / scale;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        nodeEls.forEach(el => {
            const r = el.getBoundingClientRect();
            minX = Math.min(minX, toStageX(r.left));
            minY = Math.min(minY, toStageY(r.top));
            maxX = Math.max(maxX, toStageX(r.right));
            maxY = Math.max(maxY, toStageY(r.bottom));
        });

        const boxWidth = Math.max(maxX - minX, 1);
        const boxHeight = Math.max(maxY - minY, 1);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Zoom to fit the bounding box, but never enlarge past 100%.
        const targetScale = computeFitScale(
            boxWidth,
            boxHeight,
            rect.width,
            rect.height,
        );

        // Which stage point should land at the viewport centre. For "right" we place the box's
        // right edge near the right side (leaving room to build nodes to its left, used only for
        // the still-empty canvas's default output node); otherwise we centre the box.
        const focusX =
            align === 'right'
                ? maxX - (rect.width / 2 - FIT_PADDING) / targetScale
                : centerX;

        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height / 2;

        // 1. Pan (at the current scale) so `focusX`/the box's centre sits at the viewport centre.
        dispatchPan(
            stage,
            originX,
            originY,
            focusX * scale - translateX,
            centerY * scale - translateY,
        );

        // 2. Centred zoom to the fit scale. A centred zoom keeps the viewport-centre point
        //    fixed, so the positioning from step 1 is preserved while it scales.
        const steps = clamp(
            Math.round(Math.abs(targetScale - scale) / MAX_SCALE_STEP),
            0,
            120,
        );
        if (steps > 0) {
            dispatchWheel(
                stage,
                targetScale > scale ? -10 : 10,
                originX,
                originY,
                steps,
            );
        }
    }, [getStage]);

    // Auto-fit once the editor has mounted and the nodes have laid out, so a brand-new graph
    // (Flume's own default output node) opens framed. Every other graph index.tsx pushes in
    // (AI-generated, re-arranged) already arrives pre-framed - see `centerGraph`/`computeFitScale`
    // in buildFlumeGraph.ts and their callers - so this only ever runs once, here.
    useEffect(() => {
        let frame = 0;
        let attempts = 0;
        const tick = () => {
            const stage = getStage();
            const nodeCount = stage?.querySelectorAll(NODE_SELECTOR).length ?? 0;
            if (nodeCount > 0) {
                // One extra frame so node sizes are settled before we measure them. A lone node is
                // the still-empty canvas's default output node - keep it to the right, with room
                // to build inputs to its left; an existing/generated graph is centred instead.
                frame = requestAnimationFrame(() =>
                    fitToNodes(nodeCount === 1 ? 'right' : 'center'),
                );
            } else if (attempts < 30) {
                attempts += 1;
                frame = requestAnimationFrame(tick);
            }
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [getStage, fitToNodes]);

    return (
        <Box
            sx={styles.container}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
        >
            <Box
                component="button"
                type="button"
                title={formatMessage(MESSAGES.zoomIn)}
                aria-label={formatMessage(MESSAGES.zoomIn)}
                sx={styles.button}
                onClick={() => zoom(1)}
            >
                <Box component="span" sx={styles.zoomLabel}>
                    +
                </Box>
            </Box>
            <Box
                component="button"
                type="button"
                title={formatMessage(MESSAGES.zoomOut)}
                aria-label={formatMessage(MESSAGES.zoomOut)}
                sx={styles.button}
                onClick={() => zoom(-1)}
            >
                <Box component="span" sx={styles.zoomLabel}>
                    −
                </Box>
            </Box>
            <Box
                component="button"
                type="button"
                title={formatMessage(MESSAGES.fitToContent)}
                aria-label={formatMessage(MESSAGES.fitToContent)}
                sx={styles.button}
                onClick={() => fitToNodes()}
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                >
                    <path d="M1 4V1h3M10 1h3v3M13 10v3h-3M4 13H1v-3" />
                </svg>
            </Box>
        </Box>
    );
};
