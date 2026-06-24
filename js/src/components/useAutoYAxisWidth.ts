import { useMemo } from 'react';
import { useTheme } from '@mui/material';

// TODO(recharts upgrade): this whole helper exists only because recharts v2's
// <YAxis> needs a numeric `width` and SVG text can't size itself via CSS. From
// recharts v3 the axis supports `width="auto"`, which measures its labels
// natively. Once recharts is upgraded, delete this file and replace usages with
// <YAxis width="auto" /> (plus a tickFormatter for truncation if still wanted).

const AXIS_FONT_SIZE = 12; // px, matches our 0.75rem axis ticks
const TICK_MARGIN = 4;
const AXIS_PADDING = 8;

// Precise text width via a shared canvas (exact font metrics), measured once
// per unique font rather than estimated from character counts.
const measureTextWidth = (() => {
    let ctx: CanvasRenderingContext2D | null | undefined;
    return (text: string, font: string): number => {
        if (ctx === undefined) {
            ctx = document.createElement('canvas').getContext('2d');
        }
        if (!ctx) {
            return text.length * 8;
        }
        ctx.font = font;
        return Math.ceil(ctx.measureText(text).width);
    };
})();

type UseAutoYAxisWidthParams = {
    /** All category labels rendered on the axis. */
    labels: string[];
    /**
     * Longest label to show in full. Labels longer than this are truncated with
     * an ellipsis, which also caps the axis width at this label's width.
     */
    maxLabel?: string;
    /** Axis tick font size in px (defaults to our standard 12px / 0.75rem). */
    fontSize?: number;
};

type UseAutoYAxisWidthResult = {
    /** Numeric width to pass to <YAxis width={...} />. */
    width: number;
    /** tickFormatter that truncates labels past `maxLabel`'s length. */
    formatTick: (label: string) => string;
};

/**
 * Sizes a recharts category <YAxis> to only the space its longest (truncated)
 * label needs, so it shrinks automatically while staying capped at `maxLabel`.
 */
export const useAutoYAxisWidth = ({
    labels,
    maxLabel,
    fontSize = AXIS_FONT_SIZE,
}: UseAutoYAxisWidthParams): UseAutoYAxisWidthResult => {
    const theme = useTheme();
    const fontFamily = theme.typography.fontFamily ?? 'sans-serif';

    return useMemo(() => {
        const maxChars = maxLabel?.length ?? Infinity;
        const formatTick = (label: string): string =>
            label.length > maxChars
                ? `${label.slice(0, maxChars - 1).trimEnd()}…`
                : label;

        const font = `${fontSize}px ${fontFamily}`;
        const widest = labels.reduce(
            (max, label) =>
                Math.max(max, measureTextWidth(formatTick(label), font)),
            0,
        );

        return {
            width: widest + TICK_MARGIN + AXIS_PADDING,
            formatTick,
        };
    }, [labels, maxLabel, fontSize, fontFamily]);
};

export const AUTO_Y_AXIS_TICK_MARGIN = TICK_MARGIN;
