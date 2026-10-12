import { SxStyles } from 'Iaso/types/general';

export const OPTION_MENU_MIN_WIDTH = 300;

export const optionMenuStyles = {
    paper: {
        minWidth: OPTION_MENU_MIN_WIDTH,
        maxHeight: 360,
    },
    list: {
        py: 0.5,
    },
    groupLabel: {
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: 'background.paper',
        px: 2,
        pt: 1.25,
        pb: 0.5,
        typography: 'caption',
        lineHeight: 1.4,
        color: 'text.secondary',
    },
    option: {
        display: 'block',
        minHeight: 0,
        px: 2,
        py: '7px',
        typography: 'body2',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
} satisfies SxStyles;
