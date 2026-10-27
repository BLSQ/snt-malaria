import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../constants/overrideColors';

export const CONTROL_HEIGHT = 32;

export const controlStyles = {
    button: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: CONTROL_HEIGHT,
        boxSizing: 'border-box',
        px: '11px',
        py: 0,
        typography: 'button',
        fontSize: '0.8125rem',
        textTransform: 'none',
        whiteSpace: 'nowrap',
        color: 'text.secondary',
        '&:hover': { backgroundColor: overrideColors.rowHoverBackground },
    },
    selectedButton: {
        color: 'primary.main',
        backgroundColor: overrideColors.actionHoverBackground,
        '&:hover': { backgroundColor: overrideColors.actionHoverBackground },
    },
} satisfies SxStyles;

export const compactToggleGroupStyles = {
    whiteSpace: 'nowrap',
    '& .MuiToggleButton-root': {
        ...controlStyles.button,
        borderColor: overrideColors.controlBorder,
        '&.Mui-selected': controlStyles.selectedButton,
    },
};
