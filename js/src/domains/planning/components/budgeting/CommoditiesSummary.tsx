import React, { FC, useMemo } from 'react';
import { Inventory2Outlined } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { WidgetCard } from '../../../../components/WidgetCard';
import { pluralize } from '../../../../utils/pluralize';
import { useGetCostUnitTypes } from '../../../settings/costUnits/hooks/useGetCostUnitTypes';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { aggregateProcurementQuantitiesByUnit } from '../../libs/budget-aggregation';
import { formatQuantity } from '../../libs/cost-utils';

const styles = {
    // Two commodity widgets per row; a lone widget on the last row spans both
    // columns.
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 1,
    },
    fullWidth: {
        gridColumn: '1 / -1',
    },
    value: {
        fontWeight: 600,
    },
} satisfies SxStyles;

export const CommoditiesSummary: FC = () => {
    const { budgets } = usePlanningContext();
    const { data: costUnitTypes } = useGetCostUnitTypes();

    const commodities = useMemo(() => {
        const commodityUnitNames = new Set(
            (costUnitTypes ?? [])
                .filter(unit => unit.is_commodity)
                .map(unit => unit.name),
        );
        return aggregateProcurementQuantitiesByUnit(
            budgets,
            commodityUnitNames,
        );
    }, [budgets, costUnitTypes]);

    if (commodities.length === 0) {
        return null;
    }

    const isLastOdd = commodities.length % 2 === 1;

    return (
        <Box sx={styles.grid}>
            {commodities.map((commodity, index) => (
                <Box
                    key={commodity.unitName}
                    sx={
                        isLastOdd && index === commodities.length - 1
                            ? styles.fullWidth
                            : undefined
                    }
                >
                    <WidgetCard title="" icon={Inventory2Outlined}>
                        <Typography variant="h5" sx={styles.value}>
                            {formatQuantity(commodity.quantity)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {pluralize(commodity.unitName, commodity.quantity)}
                        </Typography>
                    </WidgetCard>
                </Box>
            ))}
        </Box>
    );
};
