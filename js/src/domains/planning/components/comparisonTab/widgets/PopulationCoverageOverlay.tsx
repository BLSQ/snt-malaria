import React, { FC } from 'react';
import { GroupsOutlined } from '@mui/icons-material';
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
import { mergeCoverageRowsBySlot } from '../../../libs/comparison-aggregation';
import {
    formatBigNumber,
    formatPercentValue,
    percentOfTotal,
} from '../../../libs/cost-utils';
import { InterventionCoverage } from '../../../types/comparisonAggregation';
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
    coverageBySlotIndex: InterventionCoverage[][];
    isBudgetLoading: boolean;
    totalPopulation?: number;
};

export const PopulationCoverageOverlay: FC<Props> = ({
    title,
    slots,
    coverageBySlotIndex,
    isBudgetLoading,
    totalPopulation,
}) => {
    const { formatMessage } = useSafeIntl();

    const coverageBySlotKey = new Map(
        slots.map((slot, index) => [slot.key, coverageBySlotIndex[index]]),
    );
    const rows = mergeCoverageRowsBySlot(coverageBySlotKey);

    return (
        <WidgetCard
            title={title}
            icon={GroupsOutlined}
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
                                    MESSAGES.comparisonPopulationLayerLabel,
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
                                            MESSAGES.comparisonPersonsAtRisk,
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {formatMessage(
                                            MESSAGES.comparisonPercentEligible,
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {formatMessage(
                                            MESSAGES.comparisonPercentTotalPop,
                                        )}
                                    </TableCell>
                                </React.Fragment>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => (
                            <TableRow
                                key={`${row.interventionId}-${row.layerId}`}
                            >
                                <TableCell>{row.interventionLabel}</TableCell>
                                <TableCell>{row.layerName}</TableCell>
                                {slots.map(slot => {
                                    const cell = row.cellBySlotKey[slot.key];
                                    return (
                                        <React.Fragment key={slot.key}>
                                            <TableCell align="right">
                                                {cell
                                                    ? formatBigNumber(
                                                          cell.personsAtRisk,
                                                      )
                                                    : '-'}
                                            </TableCell>
                                            <TableCell align="right">
                                                {cell
                                                    ? formatPercentValue(
                                                          cell.percentEligible,
                                                      )
                                                    : '-'}
                                            </TableCell>
                                            <TableCell align="right">
                                                {cell
                                                    ? (percentOfTotal(
                                                          cell.personsAtRisk,
                                                          totalPopulation,
                                                      ) ?? '-')
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
