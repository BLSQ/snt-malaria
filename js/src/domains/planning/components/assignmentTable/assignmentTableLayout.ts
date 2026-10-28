import { overrideColors } from '../../../../constants/overrideColors';
import { AssignmentTableMode } from './buildAssignmentTable';

export const DISTRICT_COLUMN_WIDTH = 220;
export const INTERVENTION_COLUMN_WIDTH = 140;
export const COST_ITEM_COLUMN_WIDTH = 112;
export const GROUP_HEADER_HEIGHT = 44;
export const ROW_HEIGHT = 40;

export const getColumnWidth = (isCostItem: boolean) =>
    isCostItem ? COST_ITEM_COLUMN_WIDTH : INTERVENTION_COLUMN_WIDTH;

export const getRuleDotSize = (mode: AssignmentTableMode) =>
    mode === 'costItems' ? 8 : 10;

const tint = (color: string) => `linear-gradient(${color}, ${color})`;

export const highlightTint = tint(overrideColors.actionHoverBackground);
export const crosshairTint = tint(overrideColors.crosshairBackground);
export const hoveredCellTint = tint(overrideColors.hoveredCellBackground);

export const ellipsis = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
} as const;

export const districtColumnStyles = {
    position: 'sticky',
    left: 0,
    boxSizing: 'border-box',
    width: DISTRICT_COLUMN_WIDTH,
    minWidth: DISTRICT_COLUMN_WIDTH,
    maxWidth: DISTRICT_COLUMN_WIDTH,
    borderRight: 1,
    borderRightColor: 'divider',
    borderBottomColor: 'divider',
    px: 1.5,
} as const;

export const fillerCellStyles = {
    p: 0,
    borderBottom: 1,
    borderBottomColor: 'divider',
} as const;
