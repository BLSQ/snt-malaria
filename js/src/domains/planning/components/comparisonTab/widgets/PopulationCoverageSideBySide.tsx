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
import { MESSAGES } from '../../../../messages';
import { InterventionCoverage } from '../../../libs/comparison-aggregation';
import { formatBigNumber, formatPercentValue } from '../../../libs/cost-utils';
import { ComparisonSlot } from '../types';
import { SideBySideWidgetGrid } from './SideBySideWidgetGrid';

const CHART_HEIGHT = 320;

const styles = {
    body: {
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
    },
    tableScrollArea: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
    },
} satisfies SxStyles;

const percentOfTotal = (value: number, total?: number): string | undefined =>
    total ? formatPercentValue(value / total) : undefined;

type Props = {
    title: string;
    slots: ComparisonSlot[];
    coverageBySlotIndex: InterventionCoverage[][];
    isBudgetLoading: boolean;
    totalPopulation?: number;
};

export const PopulationCoverageSideBySide: FC<Props> = ({
    title,
    slots,
    coverageBySlotIndex,
    isBudgetLoading,
    totalPopulation,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <SideBySideWidgetGrid
            slots={slots}
            title={title}
            icon={GroupsOutlined}
            isLoading={isBudgetLoading}
            bodySx={styles.body}
        >
            {(_slot, index) =>
                coverageBySlotIndex[index].length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                        {formatMessage(MESSAGES.noBudgetData)}
                    </Typography>
                ) : (
                    <CoverageTable
                        rows={coverageBySlotIndex[index]}
                        totalPopulation={totalPopulation}
                    />
                )
            }
        </SideBySideWidgetGrid>
    );
};

type CoverageTableProps = {
    rows: InterventionCoverage[];
    totalPopulation?: number;
};

const CoverageTable: FC<CoverageTableProps> = ({ rows, totalPopulation }) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Box sx={styles.tableScrollArea}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            {formatMessage(MESSAGES.comparisonIntervention)}
                        </TableCell>
                        <TableCell>
                            {formatMessage(
                                MESSAGES.comparisonPopulationLayerLabel,
                            )}
                        </TableCell>
                        <TableCell align="right">
                            {formatMessage(MESSAGES.comparisonPersonsAtRisk)}
                        </TableCell>
                        <TableCell align="right">
                            {formatMessage(MESSAGES.comparisonPercentEligible)}
                        </TableCell>
                        <TableCell align="right">
                            {formatMessage(MESSAGES.comparisonPercentTotalPop)}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.flatMap(row =>
                        row.layers.map(layer => (
                            <TableRow
                                key={`${row.interventionId}-${layer.layerId}`}
                            >
                                <TableCell>{row.interventionLabel}</TableCell>
                                <TableCell>{layer.layerName}</TableCell>
                                <TableCell align="right">
                                    {formatBigNumber(layer.personsAtRisk)}
                                </TableCell>
                                <TableCell align="right">
                                    {formatPercentValue(layer.percentEligible)}
                                </TableCell>
                                <TableCell align="right">
                                    {percentOfTotal(
                                        layer.personsAtRisk,
                                        totalPopulation,
                                    ) ?? '-'}
                                </TableCell>
                            </TableRow>
                        )),
                    )}
                </TableBody>
            </Table>
        </Box>
    );
};
