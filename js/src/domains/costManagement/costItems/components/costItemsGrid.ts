// Every column shares the free space equally; a column only grows or shrinks
// unevenly once the even share drops below its minimum width.
const evenColumn = (minWidth: number) => `minmax(${minWidth}px, 1fr)`;

export const COST_ITEMS_INPUT_WIDTH = 100;

// Shared by the header and every row so the columns line up:
// name | unit cost + unit | factor + direction | buffer | coverage | actions
export const COST_ITEMS_GRID_COLUMNS = [
    evenColumn(220),
    evenColumn(180),
    evenColumn(220),
    evenColumn(COST_ITEMS_INPUT_WIDTH),
    evenColumn(COST_ITEMS_INPUT_WIDTH),
    '32px',
].join(' ');

export const COST_ITEMS_GRID_MIN_WIDTH = 1024;

export const COST_ITEMS_HEADER_HEIGHT = 36;

export const COST_ITEMS_ROW_PADDING_LEFT = 5;
