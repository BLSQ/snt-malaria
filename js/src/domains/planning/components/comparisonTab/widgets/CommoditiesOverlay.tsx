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
import {
    InterventionCommodities,
    mergeCommodityRowsBySlot,
} from '../../../libs/comparison-aggregation';
import { formatBigNumber, formatQuantity } from '../../../libs/cost-utils';
import { ComparisonSlot } from '../types';

const CHART_HEIGHT = 320;

const styles = {
    overlayBody: {
        height: CHART_HEIGHT,
        overflow: 'auto',
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

type Props = {
    title: string;
    slots: ComparisonSlot[];
    commoditiesBySlotIndex: InterventionCommodities[][];
    isBudgetLoading: boolean;
    currency: string;
};

export const CommoditiesOverlay: FC<Props> = ({
    title,
    slots,
    commoditiesBySlotIndex,
    isBudgetLoading,
    currency,
}) => {
    const { formatMessage } = useSafeIntl();

    const commoditiesBySlotKey = new Map(
        slots.map((slot, index) => [slot.key, commoditiesBySlotIndex[index]]),
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
                                                    backgroundColor: slot.color,
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
                                {formatMessage(MESSAGES.comparisonIntervention)}
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
                                <TableCell>{row.interventionLabel}</TableCell>
                                <TableCell>{row.unitName}</TableCell>
                                {slots.map(slot => {
                                    const cell = row.cellBySlotKey[slot.key];
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
};
