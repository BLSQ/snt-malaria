import React, { FC, MouseEvent, useCallback, useState } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { Box, ButtonBase, Menu, MenuItem } from '@mui/material';
import { IntlMessage, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../constants/overrideColors';
import { MESSAGES } from '../../../messages';
import { CostLineValueField } from '../../libs/override-utils';
import { AssignmentTableMode } from './buildAssignmentTable';
import { CONTROL_HEIGHT } from './controlStyles';

type SelectValue = CostLineValueField | 'none';

const OPTIONS: { value: SelectValue; message: IntlMessage }[] = [
    { value: 'none', message: MESSAGES.none },
    { value: 'unit_cost', message: MESSAGES.budgetingCostLineUnitCost },
    { value: 'conversion_factor', message: MESSAGES.conversionFactorShort },
    { value: 'buffer', message: MESSAGES.budgetingCostLineBuffer },
    { value: 'coverage', message: MESSAGES.coverageLabel },
];

const styles = {
    root: {
        display: 'inline-flex',
        border: `1px solid ${overrideColors.inputBorder}`,
        borderRadius: 1,
        backgroundColor: 'background.paper',
    },
    selectedValueRoot: {
        backgroundColor: overrideColors.actionHoverBackground,
    },
    button: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        minWidth: 150,
        height: CONTROL_HEIGHT,
        boxSizing: 'border-box',
        pl: '10px',
        pr: 0.5,
        borderRadius: '3px',
        typography: 'body2',
        whiteSpace: 'nowrap',
        color: 'text.secondary',
        '&:hover': { backgroundColor: overrideColors.rowHoverBackground },
    },
    selectedValueButton: { color: 'primary.main' },
    label: { flex: '1 1 auto', textAlign: 'left' },
    icon: { fontSize: 18 },
    dropDownIcon: { fontSize: 20, color: 'text.secondary' },
    menuPaper: { mt: 0.5, minWidth: 200 },
    menuItem: { height: 36, typography: 'body2' },
    selectedMenuItem: { color: 'primary.main' },
} satisfies SxStyles;

type Props = {
    mode: AssignmentTableMode;
    onModeChange: (mode: AssignmentTableMode) => void;
    field: CostLineValueField;
    onFieldChange: (field: CostLineValueField) => void;
};

export const AssignmentValueSelect: FC<Props> = ({
    mode,
    onModeChange,
    field,
    onFieldChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const value: SelectValue = mode === 'costItems' ? field : 'none';
    const hasValue = value !== 'none';
    const selectedOption = OPTIONS.find(option => option.value === value);

    const handleMenuOpen = useCallback(
        (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget),
        [],
    );
    const handleMenuClose = useCallback(() => setMenuAnchor(null), []);
    const handleSelect = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            const selected = event.currentTarget.dataset.value as SelectValue;
            if (selected === 'none') {
                onModeChange('interventions');
            } else {
                onFieldChange(selected);
                onModeChange('costItems');
            }
            setMenuAnchor(null);
        },
        [onFieldChange, onModeChange],
    );

    return (
        <Box sx={[styles.root, hasValue && styles.selectedValueRoot]}>
            <ButtonBase
                onClick={handleMenuOpen}
                aria-haspopup="menu"
                sx={[styles.button, hasValue && styles.selectedValueButton]}
            >
                <ReceiptLongOutlinedIcon sx={styles.icon} />
                <Box component="span" sx={styles.label}>
                    {selectedOption && formatMessage(selectedOption.message)}
                </Box>
                <ArrowDropDownIcon sx={styles.dropDownIcon} />
            </ButtonBase>
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: styles.menuPaper } }}
            >
                {OPTIONS.map(option => (
                    <MenuItem
                        key={option.value}
                        data-value={option.value}
                        selected={option.value === value}
                        onClick={handleSelect}
                        sx={[
                            styles.menuItem,
                            option.value === value && styles.selectedMenuItem,
                        ]}
                    >
                        {formatMessage(option.message)}
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
};
