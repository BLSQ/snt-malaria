import React, { FC } from 'react';
import {
    roundedTopOutlinePath,
    roundedTopRectPath,
} from '../../../../components/charts/barPaths';

const BAR_RADIUS = 4;
// The grant-envelope outline sits slightly wider than the cost bar so there's
// a small gap on each side, as in the design.
const TARGET_SIDE_GAP = 4;

export type BudgetChartDatum = {
    name: string;
    cost: number;
    amount: number | null;
};

type BudgetBarShapeProps = {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: BudgetChartDatum;
    withinColor: string;
    excessColor: string;
    targetColor: string;
};

/**
 * Custom bar shape for the grant budget chart. recharts sizes (x, y, width,
 * height) against the cost value; from that we derive a pixels-per-value factor
 * and redraw the bar as:
 *  - a grey rect up to min(cost, amount),
 *  - a red rect for the part of cost that exceeds the grant amount,
 *  - a dashed, unfilled rect outlining the grant amount target.
 * Only the topmost segment gets rounded top corners.
 */
export const BudgetBarShape: FC<BudgetBarShapeProps> = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    payload,
    withinColor,
    excessColor,
    targetColor,
}) => {
    const cost = payload?.cost ?? 0;
    const amount = payload?.amount ?? null;

    if (cost <= 0 || height <= 0) {
        return null;
    }

    const pxPerValue = height / cost;
    const baseline = y + height;

    const withinValue = amount != null ? Math.min(cost, amount) : cost;
    const withinHeight = withinValue * pxPerValue;
    const hasExcess = amount != null && cost > amount;
    const excessHeight = hasExcess ? (cost - amount) * pxPerValue : 0;
    const targetHeight = amount != null ? amount * pxPerValue : 0;

    return (
        <g>
            {hasExcess ? (
                <rect
                    x={x}
                    y={baseline - withinHeight}
                    width={width}
                    height={withinHeight}
                    fill={withinColor}
                />
            ) : (
                <path
                    d={roundedTopRectPath(
                        x,
                        baseline - withinHeight,
                        width,
                        withinHeight,
                        BAR_RADIUS,
                    )}
                    fill={withinColor}
                />
            )}
            {hasExcess && (
                <path
                    d={roundedTopRectPath(
                        x,
                        baseline - withinHeight - excessHeight,
                        width,
                        excessHeight,
                        BAR_RADIUS,
                    )}
                    fill={excessColor}
                />
            )}
            {amount != null && (
                <path
                    d={roundedTopOutlinePath(
                        x - TARGET_SIDE_GAP,
                        baseline - targetHeight,
                        width + TARGET_SIDE_GAP * 2,
                        targetHeight,
                        0,
                    )}
                    fill="none"
                    stroke={targetColor}
                    strokeDasharray="1 4"
                    strokeLinecap="round"
                    strokeWidth={1.75}
                />
            )}
        </g>
    );
};
