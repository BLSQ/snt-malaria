import React, { FC } from 'react';
import { Inventory2Outlined } from '@mui/icons-material';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { MESSAGES } from '../../../../messages';
import { useGetCostUnitTypes } from '../../../../settings/costUnits/hooks/useGetCostUnitTypes';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import {
    InterventionCommodities,
    getSlotCommoditiesByIntervention,
    mergeCommodityRowsBySlot,
} from '../../../libs/comparison-aggregation';
import { formatBigNumber, formatQuantity } from '../../../libs/cost-utils';
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
    overlayBody: {
        height: CHART_HEIGHT,
        overflow: 'auto',
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
    slotHeaderCell: {
        borderLeft: '2px solid',
    },
    slotHeaderLabel: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
    },
    slotDot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        flexShrink: 0,
    },
} satisfies SxStyles;

export const CommoditiesWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { slots, budgetsBySlotKey, isBudgetLoading, currency, displayMode } =
        useScenarioComparisonContext();
    const { data: costUnitTypes } = useGetCostUnitTypes();

    const commodityUnitNames = new Set(
        (costUnitTypes ?? [])
            .filter(unit => unit.is_commodity)
            .map(unit => unit.name),
    );

    const title = formatMessage(MESSAGES.comparisonCommoditiesTitle);

    if (displayMode === 'overlay') {
        const commoditiesBySlotKey = new Map(
            slots.map(slot => [
                slot.key,
                getSlotCommoditiesByIntervention(
                    budgetsBySlotKey.get(slot.key),
                    commodityUnitNames,
                ),
            ]),
        );
        const rows = mergeCommodityRowsBySlot(commoditiesBySlotKey);

        return (
            <WidgetCard
                title={title}
                icon={Inventory2Outlined}
                isLoading={isBudgetLoading}
                bodySx={styles.overlayBody}
            >
                {rows.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                        {formatMessage(MESSAGES.noBudgetData)}
                    </Typography>
                ) : (
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell />
                                <TableCell />
                                {slots.map(slot => (
                                    <TableCell
                                        key={slot.key}
                                        colSpan={3}
                                        align="center"
                                        sx={[
                                            styles.slotHeaderCell,
                                            { borderColor: slot.color },
                                        ]}
                                    >
                                        <Box sx={styles.slotHeaderLabel}>
                                            <Box
                                                sx={[
                                                    styles.slotDot,
                                                    {
                                                        backgroundColor:
                                                            slot.color,
                                                    },
                                                ]}
                                            />
                                            {slot.label}
                                        </Box>
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell>
                                    {formatMessage(
                                        MESSAGES.comparisonIntervention,
                                    )}
                                </TableCell>
                                <TableCell>
                                    {formatMessage(
                                        MESSAGES.comparisonCommodityLabel,
                                    )}
                                </TableCell>
                                {slots.map(slot => (
                                    <React.Fragment key={slot.key}>
                                        <TableCell
                                            align="right"
                                            sx={[
                                                styles.slotHeaderCell,
                                                { borderColor: slot.color },
                                            ]}
                                        >
                                            {formatMessage(
                                                MESSAGES.comparisonQuantityLabel,
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {formatMessage(
                                                MESSAGES.budgetingCostLineUnitCost,
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {formatMessage(
                                                MESSAGES.comparisonTotalCostColumnLabel,
                                            )}
                                        </TableCell>
                                    </React.Fragment>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map(row => (
                                <TableRow
                                    key={`${row.interventionId}-${row.unitName}`}
                                >
                                    <TableCell>
                                        {row.interventionLabel}
                                    </TableCell>
                                    <TableCell>{row.unitName}</TableCell>
                                    {slots.map(slot => {
                                        const cell =
                                            row.cellBySlotKey[slot.key];
                                        return (
                                            <React.Fragment key={slot.key}>
                                                <TableCell align="right">
                                                    {cell
                                                        ? formatQuantity(
                                                              cell.quantity,
                                                          )
                                                        : '-'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {cell?.unitCost != null
                                                        ? formatBigNumber(
                                                              cell.unitCost,
                                                              currency,
                                                          )
                                                        : '-'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {cell
                                                        ? formatBigNumber(
                                                              cell.totalCost,
                                                              currency,
                                                          )
                                                        : '-'}
                                                </TableCell>
                                            </React.Fragment>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </WidgetCard>
        );
    }

    return (
        <SideBySideWidgetGrid
            slots={slots}
            title={title}
            icon={Inventory2Outlined}
            isLoading={isBudgetLoading}
            bodySx={styles.sideBySideBody}
        >
            {slot => {
                const commoditiesByIntervention =
                    getSlotCommoditiesByIntervention(
                        budgetsBySlotKey.get(slot.key),
                        commodityUnitNames,
                    );
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
