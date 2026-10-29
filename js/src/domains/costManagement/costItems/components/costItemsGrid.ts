// Flexible columns share the free space by weight; a column only grows or
// shrinks unevenly once its share drops below its minimum width.
const flexColumn = (minWidth: number, weight = 1) =>
    `minmax(${minWidth}px, ${weight}fr)`;

export const COST_ITEMS_INPUT_WIDTH = 100;

// Wide enough for the "Coverage / quantity" header in every language.
const COVERAGE_COLUMN_WIDTH = 140;

// Shared by the header and every row so the columns line up:
// name | unit cost + unit | target population | factor + direction | buffer | coverage | actions
export const COST_ITEMS_GRID_COLUMNS = [
    flexColumn(220, 2),
    flexColumn(180),
    flexColumn(160),
    flexColumn(220),
    `${COST_ITEMS_INPUT_WIDTH}px`,
    `${COVERAGE_COLUMN_WIDTH}px`,
    '64px',
].join(' ');

export const COST_ITEMS_GRID_MIN_WIDTH = 1216;

export const COST_ITEMS_HEADER_HEIGHT = 36;

export const COST_ITEMS_ROW_PADDING_LEFT = 5;
