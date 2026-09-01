import React, { ElementType, FC, ReactNode } from 'react';
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
import { ComparisonSlot } from '../types';

const CHART_HEIGHT = 320;

const styles = {
    body: {
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

export type SlotComparisonRow = {
    key: string;
    interventionLabel: string;
    subLabel: string;
    // One pre-rendered cell per `perSlotColumnLabels` entry, per slot key.
    cellsBySlotKey: Record<string, ReactNode[]>;
};

type Props = {
    title: string;
    icon: ElementType;
    isLoading: boolean;
    slots: ComparisonSlot[];
    subColumnLabel: string;
    perSlotColumnLabels: string[];
    rows: SlotComparisonRow[];
    emptyMessage: string;
};

// Combined table for a comparison-tab metric: two leading columns per row
// (intervention + a sub-item), then `perSlotColumnLabels.length` columns for
// each slot, grouped under a colour-coded slot header.
export const SlotComparisonTable: FC<Props> = ({
    title,
    icon,
    isLoading,
    slots,
    subColumnLabel,
    perSlotColumnLabels,
    rows,
    emptyMessage,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <WidgetCard
            title={title}
            icon={icon}
            isLoading={isLoading}
            bodySx={styles.body}
        >
            {rows.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                    {emptyMessage}
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
                                    colSpan={perSlotColumnLabels.length}
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
                                                { backgroundColor: slot.color },
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
                            <TableCell>{subColumnLabel}</TableCell>
                            {slots.map(slot => (
                                <React.Fragment key={slot.key}>
                                    {perSlotColumnLabels.map((label, index) => (
                                        <TableCell
                                            key={label}
                                            align="right"
                                            sx={
                                                index === 0
                                                    ? [
                                                          styles.slotHeaderCell,
                                                          {
                                                              borderColor:
                                                                  slot.color,
                                                          },
                                                      ]
                                                    : undefined
                                            }
                                        >
                                            {label}
                                        </TableCell>
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => (
                            <TableRow key={row.key}>
                                <TableCell>{row.interventionLabel}</TableCell>
                                <TableCell>{row.subLabel}</TableCell>
                                {slots.map(slot => (
                                    <React.Fragment key={slot.key}>
                                        {React.Children.toArray(
                                            (
                                                row.cellsBySlotKey[slot.key] ??
                                                []
                                            ).map(cell => (
                                                <TableCell align="right">
                                                    {cell}
                                                </TableCell>
                                            )),
                                        )}
                                    </React.Fragment>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </WidgetCard>
    );
};
