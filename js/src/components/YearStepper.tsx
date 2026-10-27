import React, { FC, MouseEvent, useCallback, useState } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, ButtonBase, Menu, MenuItem } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../constants/overrideColors';
import { MESSAGES } from '../domains/messages';

const BUTTON_HEIGHT = 30;
const INNER_RADIUS = '3px';

const styles = {
    root: {
        display: 'inline-flex',
        alignItems: 'stretch',
        border: `1px solid ${overrideColors.inputBorder}`,
        borderRadius: 1,
        backgroundColor: 'background.paper',
    },
    button: {
        height: BUTTON_HEIGHT,
        boxSizing: 'border-box',
        '&:hover': { backgroundColor: overrideColors.rowHoverBackground },
    },
    stepButton: {
        width: BUTTON_HEIGHT,
        color: 'text.secondary',
        '&.Mui-disabled': { color: overrideColors.notApplicableText },
    },
    previousButton: {
        borderRadius: `${INNER_RADIUS} 0 0 ${INNER_RADIUS}`,
    },
    nextButton: {
        borderRadius: `0 ${INNER_RADIUS} ${INNER_RADIUS} 0`,
    },
    yearButton: {
        gap: '2px',
        pl: '10px',
        pr: 0.5,
        borderLeft: `1px solid ${overrideColors.controlBorder}`,
        borderRight: `1px solid ${overrideColors.controlBorder}`,
        typography: 'body2',
        fontWeight: 'medium',
        fontVariantNumeric: 'tabular-nums',
        color: 'text.primary',
    },
    icon: { fontSize: 20 },
    dropDownIcon: { fontSize: 20, color: 'text.secondary' },
    menuPaper: { mt: 0.5, maxHeight: 320 },
    menuItem: {
        height: 36,
        pl: '10px',
        pr: 0.5,
        typography: 'body2',
        fontVariantNumeric: 'tabular-nums',
    },
    selectedMenuItem: { color: 'primary.main' },
} satisfies SxStyles;

type Props = {
    years: number[];
    value: number;
    onChange: (year: number) => void;
};

export const YearStepper: FC<Props> = ({ years, value, onChange }) => {
    const { formatMessage } = useSafeIntl();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const index = years.indexOf(value);
    const hasPrevious = index > 0;
    const hasNext = index >= 0 && index < years.length - 1;

    const handlePrevious = useCallback(
        () => hasPrevious && onChange(years[index - 1]),
        [hasPrevious, index, onChange, years],
    );
    const handleNext = useCallback(
        () => hasNext && onChange(years[index + 1]),
        [hasNext, index, onChange, years],
    );
    const handleMenuOpen = useCallback(
        (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget),
        [],
    );
    const handleMenuClose = useCallback(() => setMenuAnchor(null), []);
    const handleYearSelect = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            onChange(Number(event.currentTarget.dataset.year));
            setMenuAnchor(null);
        },
        [onChange],
    );

    return (
        <Box sx={styles.root}>
            <ButtonBase
                onClick={handlePrevious}
                disabled={!hasPrevious}
                title={formatMessage(MESSAGES.yearStepperPrevious)}
                aria-label={formatMessage(MESSAGES.yearStepperPrevious)}
                sx={[styles.button, styles.stepButton, styles.previousButton]}
            >
                <ChevronLeftIcon sx={styles.icon} />
            </ButtonBase>
            <ButtonBase
                onClick={handleMenuOpen}
                title={formatMessage(MESSAGES.yearStepperChoose)}
                aria-haspopup="menu"
                sx={[styles.button, styles.yearButton]}
            >
                {value}
                <ArrowDropDownIcon sx={styles.dropDownIcon} />
            </ButtonBase>
            <ButtonBase
                onClick={handleNext}
                disabled={!hasNext}
                title={formatMessage(MESSAGES.yearStepperNext)}
                aria-label={formatMessage(MESSAGES.yearStepperNext)}
                sx={[styles.button, styles.stepButton, styles.nextButton]}
            >
                <ChevronRightIcon sx={styles.icon} />
            </ButtonBase>
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: [
                            styles.menuPaper,
                            { width: menuAnchor?.offsetWidth },
                        ],
                    },
                }}
            >
                {years.map(year => (
                    <MenuItem
                        key={year}
                        data-year={year}
                        selected={year === value}
                        onClick={handleYearSelect}
                        sx={[
                            styles.menuItem,
                            year === value && styles.selectedMenuItem,
                        ]}
                    >
                        {year}
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
};
