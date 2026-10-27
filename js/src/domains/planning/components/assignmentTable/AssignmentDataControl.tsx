import React, { FC, MouseEvent, useCallback, useState } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import VaccinesOutlinedIcon from '@mui/icons-material/VaccinesOutlined';
import { Box, ButtonBase, Menu, MenuItem } from '@mui/material';
import { IntlMessage, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../constants/overrideColors';
import { MESSAGES } from '../../../messages';
import { CostLineValueField } from '../../libs/override-utils';
import { AssignmentTableMode } from './buildAssignmentTable';
import { controlStyles } from './controlStyles';

const SEGMENT_RADIUS = '3px';

const styles = {
    root: {
        display: 'inline-flex',
        border: `1px solid ${overrideColors.controlBorder}`,
        borderRadius: 1,
    },
    button: controlStyles.button,
    selectedTextButton: {
        color: 'primary.main',
    },
    interventionsButton: {
        borderRadius: `${SEGMENT_RADIUS} 0 0 ${SEGMENT_RADIUS}`,
    },
    selectedInterventionsButton: controlStyles.selectedButton,
    costItemSegment: {
        display: 'flex',
        borderLeft: `1px solid ${overrideColors.controlBorder}`,
        borderRadius: `0 ${SEGMENT_RADIUS} ${SEGMENT_RADIUS} 0`,
    },
    selectedCostItemSegment: {
        backgroundColor: overrideColors.actionHoverBackground,
    },
    selectedCostItemButton: { pr: '6px' },
    fieldLabel: { fontWeight: 'regular' },
    menuButton: {
        px: 0.5,
        borderRadius: `0 ${SEGMENT_RADIUS} ${SEGMENT_RADIUS} 0`,
    },
    icon: { fontSize: 18 },
    menuIcon: { fontSize: 20 },
    menuPaper: { mt: 0.5, minWidth: 200 },
    menuItem: { height: 36, typography: 'body2' },
    selectedMenuItem: { color: 'primary.main' },
} satisfies SxStyles;

const VALUE_FIELDS: CostLineValueField[] = [
    'unit_cost',
    'conversion_factor',
    'buffer',
    'coverage',
];

const VALUE_FIELD_MESSAGES: Record<CostLineValueField, IntlMessage> = {
    unit_cost: MESSAGES.budgetingCostLineUnitCost,
    conversion_factor: MESSAGES.conversionFactorShort,
    buffer: MESSAGES.budgetingCostLineBuffer,
    coverage: MESSAGES.coverageLabel,
};

type Props = {
    mode: AssignmentTableMode;
    onModeChange: (mode: AssignmentTableMode) => void;
    field: CostLineValueField;
    onFieldChange: (field: CostLineValueField) => void;
};

export const AssignmentDataControl: FC<Props> = ({
    mode,
    onModeChange,
    field,
    onFieldChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const isCostItems = mode === 'costItems';

    const handleInterventionsClick = useCallback(
        () => onModeChange('interventions'),
        [onModeChange],
    );
    const handleCostItemsClick = useCallback(
        () => onModeChange('costItems'),
        [onModeChange],
    );
    const handleMenuOpen = useCallback(
        (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget),
        [],
    );
    const handleMenuClose = useCallback(() => setMenuAnchor(null), []);
    const handleFieldSelect = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            onFieldChange(
                event.currentTarget.dataset.field as CostLineValueField,
            );
            onModeChange('costItems');
            setMenuAnchor(null);
        },
        [onFieldChange, onModeChange],
    );

    return (
        <Box sx={styles.root}>
            <ButtonBase
                onClick={handleInterventionsClick}
                aria-pressed={!isCostItems}
                sx={[
                    styles.button,
                    styles.interventionsButton,
                    !isCostItems && styles.selectedInterventionsButton,
                ]}
            >
                <VaccinesOutlinedIcon sx={styles.icon} />
                {formatMessage(MESSAGES.assignmentTableInterventions)}
            </ButtonBase>
            <Box
                sx={[
                    styles.costItemSegment,
                    isCostItems && styles.selectedCostItemSegment,
                ]}
            >
                <ButtonBase
                    onClick={handleCostItemsClick}
                    aria-pressed={isCostItems}
                    sx={[
                        styles.button,
                        isCostItems && styles.selectedTextButton,
                        isCostItems && styles.selectedCostItemButton,
                    ]}
                >
                    <ReceiptLongOutlinedIcon sx={styles.icon} />
                    {formatMessage(MESSAGES.assignmentTableCostItem)}
                    {isCostItems && (
                        <Box component="span" sx={styles.fieldLabel}>
                            {formatMessage(VALUE_FIELD_MESSAGES[field])}
                        </Box>
                    )}
                </ButtonBase>
                {isCostItems && (
                    <ButtonBase
                        onClick={handleMenuOpen}
                        title={formatMessage(
                            MESSAGES.assignmentTableChooseValue,
                        )}
                        aria-label={formatMessage(
                            MESSAGES.assignmentTableChooseValue,
                        )}
                        aria-haspopup="menu"
                        sx={[
                            styles.button,
                            styles.selectedTextButton,
                            styles.menuButton,
                        ]}
                    >
                        <ArrowDropDownIcon sx={styles.menuIcon} />
                    </ButtonBase>
                )}
            </Box>
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: styles.menuPaper } }}
            >
                {VALUE_FIELDS.map(valueField => (
                    <MenuItem
                        key={valueField}
                        data-field={valueField}
                        selected={valueField === field}
                        onClick={handleFieldSelect}
                        sx={[
                            styles.menuItem,
                            valueField === field && styles.selectedMenuItem,
                        ]}
                    >
                        {formatMessage(VALUE_FIELD_MESSAGES[valueField])}
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
};
