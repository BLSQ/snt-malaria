import { Theme } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../../constants/overrideColors';

type Track = { min: number; max: number };

const NAME_COLUMN: Track = { min: 300, max: 400 };
const COMPACT_NAME_COLUMN: Track = { min: 210, max: 400 };
const VALUE_COLUMN_MAX = 104;
const VALUE_COLUMN_MINS = [72, 72, 72, 72];
const COMPACT_VALUE_COLUMN_MINS = [66, 66, 52, 52];
const SPACER_COLUMN: Track = { min: 12, max: 12 };
const YEAR_COLUMN: Track = { min: 52, max: 88 };
const COLUMN_GAP = 6;
const ROW_PADDING_X = 16;
// Allowance for the card border and a vertical scrollbar.
const CARD_CHROME_WIDTH = 34;
// Year columns may narrow to this width before the grid switches to compact columns.
const COMPACT_THRESHOLD_YEAR_WIDTH = 48;

const getTracks = (yearCount: number, isCompact: boolean): Track[] => [
    isCompact ? COMPACT_NAME_COLUMN : NAME_COLUMN,
    ...(isCompact ? COMPACT_VALUE_COLUMN_MINS : VALUE_COLUMN_MINS).map(min => ({
        min,
        max: VALUE_COLUMN_MAX,
    })),
    SPACER_COLUMN,
    ...Array.from({ length: yearCount }, () => YEAR_COLUMN),
];

const sumOf = (values: number[]) =>
    values.reduce((total, value) => total + value, 0);

const getGutterWidth = (trackCount: number) =>
    (trackCount - 1) * COLUMN_GAP + 2 * ROW_PADDING_X;

export const getOverridesGridColumns = (
    yearCount: number,
    isCompact: boolean,
) =>
    getTracks(yearCount, isCompact)
        .map(({ min, max }) =>
            min === max ? `${min}px` : `minmax(${min}px, ${max}px)`,
        )
        .join(' ');

export const getOverridesGridMinWidth = (
    yearCount: number,
    isCompact: boolean,
) => {
    const tracks = getTracks(yearCount, isCompact);
    return (
        sumOf(tracks.map(track => track.min)) + getGutterWidth(tracks.length)
    );
};

/** Card width below which the grid switches to compact columns. */
export const getOverridesCompactWidth = (yearCount: number) => {
    const tracks = getTracks(yearCount, false);
    const nonYearTracks = tracks.slice(0, tracks.length - yearCount);
    const fixedWidth = sumOf(nonYearTracks.map(track => track.min));
    return (
        CARD_CHROME_WIDTH +
        fixedWidth +
        yearCount * COMPACT_THRESHOLD_YEAR_WIDTH +
        getGutterWidth(tracks.length)
    );
};

/** Mirrors CSS grid track sizing and `space-between` to locate the unit cost column. */
export const getUnitCostColumnOffset = (
    gridWidth: number,
    yearCount: number,
    isCompact: boolean,
) => {
    const tracks = getTracks(yearCount, isCompact);
    const sizes = tracks.map(track => track.min);
    let freeSpace = gridWidth - getGutterWidth(tracks.length) - sumOf(sizes);
    let growable = tracks.map((_, index) => index);
    while (freeSpace > 0.5 && growable.length > 0) {
        const share = freeSpace / growable.length;
        growable.forEach(index => {
            const growth = Math.min(share, tracks[index].max - sizes[index]);
            sizes[index] += growth;
            freeSpace -= growth;
        });
        growable = growable.filter(index => sizes[index] < tracks[index].max);
    }
    const extraGap = Math.max(0, freeSpace) / (tracks.length - 1);
    return ROW_PADDING_X + sizes[0] + COLUMN_GAP + extraGap;
};

export const OVERRIDES_HOVER_ROW_CLASS = 'overridesHoverRow';
export const OVERRIDES_SCROLLED_ATTRIBUTE = 'data-scrolled';

/** Pins a row's first cell while the grid scrolls horizontally; the divider only shows once scrolled. */
export const getStickyCellStyles = (
    paddingTop: string,
    paddingBottom = paddingTop,
) => ({
    position: 'sticky',
    left: 0,
    zIndex: 1,
    alignSelf: 'stretch',
    m: `-${paddingTop} -${COLUMN_GAP}px -${paddingBottom} -${ROW_PADDING_X}px`,
    p: `${paddingTop} ${COLUMN_GAP}px ${paddingBottom} ${ROW_PADDING_X}px`,
    backgroundColor: 'background.paper',
    transition: 'background 150ms',
    [`.${OVERRIDES_HOVER_ROW_CLASS}:hover > &`]: {
        backgroundColor: `color-mix(in srgb, ${overrideColors.overriddenBorder} 4%, white)`,
    },
    [`[${OVERRIDES_SCROLLED_ATTRIBUTE}="true"] &`]: {
        boxShadow: (theme: Theme) => `1px 0 0 ${theme.palette.divider}`,
    },
});

export const OVERRIDES_ROW_TILE_SIZE = 28;

const rowLayout = {
    display: 'grid',
    justifyContent: 'space-between',
    columnGap: `${COLUMN_GAP}px`,
    alignItems: 'center',
    px: `${ROW_PADDING_X}px`,
};

export const overridesGridStyles = {
    rowLayout,
    row: {
        ...rowLayout,
        transition: 'background 150ms',
        '&:hover': { backgroundColor: overrideColors.rowHoverBackground },
    },
    tile: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: `0 0 ${OVERRIDES_ROW_TILE_SIZE}px`,
        width: OVERRIDES_ROW_TILE_SIZE,
        height: OVERRIDES_ROW_TILE_SIZE,
        borderRadius: 2,
        backgroundColor: 'grey.100',
        color: overrideColors.mutedIcon,
    },
    smallIcon: { fontSize: 16 },
    cellInput: {
        width: '100%',
        minWidth: 0,
        height: 30,
    },
    textAction: {
        flex: '0 0 auto',
        minWidth: 0,
        py: '2px',
        pl: 0.5,
        pr: 0.75,
        gap: 0.5,
        color: 'primary.main',
        typography: 'body2',
        fontWeight: 'medium',
        textTransform: 'none',
        whiteSpace: 'nowrap',
        '& .MuiButton-startIcon': { m: 0 },
        '&:hover': { backgroundColor: overrideColors.actionHoverBackground },
    },
    yearCell: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 30,
        boxSizing: 'border-box',
        border: '1px solid',
        borderColor: overrideColors.inputBorder,
        borderRadius: 1,
        backgroundColor: 'background.paper',
        cursor: 'pointer',
        userSelect: 'none',
        p: 0,
        minWidth: 0,
        typography: 'body2',
        fontVariantNumeric: 'tabular-nums',
        color: 'text.secondary',
    },
    selectedYearCell: {
        backgroundColor: overrideColors.overriddenBackground,
        borderColor: overrideColors.overriddenBorder,
        color: overrideColors.overriddenText,
        fontWeight: 'medium',
    },
} satisfies SxStyles;
