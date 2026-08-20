import React, { ElementType, FC, ReactNode } from 'react';
import { Grid } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { ComparisonSlot } from '../types';
import { SlotTag } from './SlotTag';

const styles = {
    grid: {
        flex: 1,
        minHeight: 0,
    },
    column: {
        height: '100%',
    },
} satisfies SxStyles;

type Props = {
    slots: ComparisonSlot[];
    title: string;
    icon: ElementType;
    isLoading?: boolean;
    bodySx?: Record<string, unknown>;
    children: (slot: ComparisonSlot, index: number) => ReactNode;
};

// The column split mirrors the slot row above, keeping each slot in one column.
export const SideBySideWidgetGrid: FC<Props> = ({
    slots,
    title,
    icon,
    isLoading,
    bodySx,
    children,
}) => (
    <Grid container spacing={1} sx={styles.grid}>
        {slots.map((slot, index) => (
            <Grid
                item
                xs={12}
                md={12 / slots.length}
                key={slot.key}
                sx={styles.column}
            >
                <WidgetCard
                    title={title}
                    icon={icon}
                    actions={<SlotTag color={slot.color} label={slot.label} />}
                    isLoading={isLoading}
                    bodySx={bodySx}
                >
                    {children(slot, index)}
                </WidgetCard>
            </Grid>
        ))}
    </Grid>
);
