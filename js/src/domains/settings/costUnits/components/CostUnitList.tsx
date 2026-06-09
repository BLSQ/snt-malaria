import React, { FC, useCallback } from 'react';
import { List, ListItem, ListItemText, Theme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../messages';
import { CostUnitType } from '../types';

const styles = {
    listItem: {
        cursor: 'pointer',
        borderRadius: 2,
        paddingX: (theme: Theme) => theme.spacing(1),
    },
    activeListItem: {
        backgroundColor: (theme: Theme) => theme.palette.primary.light,
        borderRadius: 2,
        paddingX: (theme: Theme) => theme.spacing(1),
    },
};

type Props = {
    costUnitTypes: CostUnitType[];
    onSelectCostUnit: (costUnit: CostUnitType) => void;
    activeCostUnitId?: number | null;
};

export const CostUnitList: FC<Props> = ({
    costUnitTypes,
    onSelectCostUnit,
    activeCostUnitId,
}) => {
    const { formatMessage, formatNumber } = useSafeIntl();

    const getRatioSummary = useCallback(
        (costUnit: CostUnitType): string | null => {
            const value =
                costUnit.value != null ? parseFloat(costUnit.value) : NaN;
            if (Number.isNaN(value)) {
                return null;
            }
            const formattedValue = formatNumber(value, {
                maximumFractionDigits: 2,
            });
            if (costUnit.invert_value) {
                return formatMessage(
                    value === 1
                        ? MESSAGES.costUnitRatioSummaryInverseOne
                        : MESSAGES.costUnitRatioSummaryInverse,
                    { value: formattedValue },
                );
            }
            return formatMessage(MESSAGES.costUnitRatioSummaryDirect, {
                value: formattedValue,
            });
        },
        [formatMessage, formatNumber],
    );

    return (
        <List>
            {costUnitTypes.map(costUnit => (
                <ListItem
                    key={costUnit.id}
                    disableGutters
                    disablePadding
                    onClick={() => onSelectCostUnit(costUnit)}
                    sx={
                        activeCostUnitId === costUnit.id
                            ? styles.activeListItem
                            : styles.listItem
                    }
                >
                    <ListItemText
                        primary={costUnit.name}
                        secondary={getRatioSummary(costUnit)}
                        secondaryTypographyProps={{ fontSize: '12px' }}
                    />
                </ListItem>
            ))}
        </List>
    );
};
