import React, { FC } from 'react';
import { Inventory2Outlined } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../../messages';
import { formatBigNumber, formatQuantity } from '../../../libs/cost-utils';
import { InterventionCommodities } from '../../../types/comparisonAggregation';
import { ComparisonSlot } from '../types';
import { SideBySideWidgetGrid } from './SideBySideWidgetGrid';

const CHART_HEIGHT = 320;

const styles = {
    sideBySideBody: {
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
    },
    commodityList: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
    },
    interventionGroup: {
        mb: 1.5,
    },
    interventionLabel: {
        fontWeight: 600,
        mb: 0.5,
    },
    commodityRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 1,
        py: 0.25,
    },
} satisfies SxStyles;

type Props = {
    title: string;
    slots: ComparisonSlot[];
    commoditiesBySlotIndex: InterventionCommodities[][];
    isBudgetLoading: boolean;
    currency: string;
};

export const CommoditiesSideBySide: FC<Props> = ({
    title,
    slots,
    commoditiesBySlotIndex,
    isBudgetLoading,
    currency,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <SideBySideWidgetGrid
            slots={slots}
            title={title}
            icon={Inventory2Outlined}
            isLoading={isBudgetLoading}
            bodySx={styles.sideBySideBody}
        >
            {(_slot, index) => {
                const commoditiesByIntervention = commoditiesBySlotIndex[index];
                if (commoditiesByIntervention.length === 0) {
                    return (
                        <Typography variant="body2" color="textSecondary">
                            {formatMessage(MESSAGES.noBudgetData)}
                        </Typography>
                    );
                }
                return (
                    <CommodityList
                        interventions={commoditiesByIntervention}
                        currency={currency}
                    />
                );
            }}
        </SideBySideWidgetGrid>
    );
};

type CommodityListProps = {
    interventions: InterventionCommodities[];
    currency: string;
};

const CommodityList: FC<CommodityListProps> = ({ interventions, currency }) => (
    <Box sx={styles.commodityList}>
        {interventions.map(intervention => (
            <Box
                key={intervention.interventionId}
                sx={styles.interventionGroup}
            >
                <Typography variant="body2" sx={styles.interventionLabel}>
                    {intervention.interventionLabel}
                </Typography>
                {intervention.commodities.map(commodity => (
                    <Box key={commodity.unitName} sx={styles.commodityRow}>
                        <Typography variant="body2">
                            {commodity.unitName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {formatQuantity(commodity.quantity)}
                            {commodity.unitCost != null &&
                                ` · ${formatBigNumber(commodity.unitCost, currency)}`}
                            {' · '}
                            {formatBigNumber(commodity.totalCost, currency)}
                        </Typography>
                    </Box>
                ))}
            </Box>
        ))}
    </Box>
);
