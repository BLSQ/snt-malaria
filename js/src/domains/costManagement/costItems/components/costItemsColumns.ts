import { SxStyles } from 'Iaso/types/general';

export const COST_ITEMS_HEADER_HEIGHT = 36;

const INPUT_WIDTH = 100;

const SPACING_PX = 8;
const ROW_PADDING_LEFT = 5;
const ROW_PADDING_RIGHT = 2;
const COLUMN_GAP = 1;

// Flex shrinks items in proportion to `flex-shrink × basis`, so weights this far
// apart make the columns give up space in order: free space (flex-grow) first,
// then captions, then the cost item name, then inputs.
const SHRINK_FIRST = 100000;
const SHRINK_SECOND = 100;
const SHRINK_LAST = 1;

const input = (minWidth: number) => ({
    flex: `0 ${SHRINK_LAST} ${INPUT_WIDTH}px`,
    minWidth,
});

const caption = (width: number) => ({
    flex: `1 ${SHRINK_FIRST} ${width}px`,
    minWidth: 0,
});

// Shared by the header and every row so the columns line up.
export const COST_ITEMS_COLUMNS = {
    name: { flex: `2 ${SHRINK_SECOND} 220px`, minWidth: 120 },
    unitCost: input(72),
    unitCostCaption: caption(72),
    targetPopulation: { flex: `1 ${SHRINK_LAST} 160px`, minWidth: 100 },
    factor: input(64),
    factorCaption: caption(112),
    buffer: input(54),
    coverage: input(54),
    actions: { flex: '0 0 64px', minWidth: 64 },
} satisfies SxStyles;

export const COST_ITEMS_ROW_MIN_WIDTH =
    Object.values(COST_ITEMS_COLUMNS).reduce(
        (total, column) => total + column.minWidth,
        0,
    ) +
    (ROW_PADDING_LEFT +
        ROW_PADDING_RIGHT +
        (Object.keys(COST_ITEMS_COLUMNS).length - 1) * COLUMN_GAP) *
        SPACING_PX;

export const costItemsRowLayout = {
    display: 'flex',
    alignItems: 'center',
    gap: COLUMN_GAP,
    minWidth: COST_ITEMS_ROW_MIN_WIDTH,
    pl: ROW_PADDING_LEFT,
    pr: ROW_PADDING_RIGHT,
};
