import React, { FC } from 'react';
import { Box } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { hoverCardSpacing } from '../../../../components/hoverCard/hoverCardSpacing';
import { HoverCardValue } from '../../../../components/hoverCard/HoverCardValue';
import { MetricType } from '../../../dataLayers/types/metrics';
import { CriterionMatchLine } from './CriterionMatchLine';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: hoverCardSpacing.section,
    },
} satisfies SxStyles;

type Props = {
    metricType: MetricType;
    value?: string | number;
    color?: string;
    /** Undefined when the layer isn't one of the rule's criteria. */
    criterionMatch?: { criterion?: string; meets?: boolean };
};

export const MetricLayerTooltipBody: FC<Props> = ({
    metricType,
    value,
    color,
    criterionMatch,
}) => (
    <Box sx={styles.root}>
        <HoverCardValue
            caption={metricType.name}
            value={value}
            unitSymbol={metricType.unit_symbol}
            color={color}
        />
        {criterionMatch && <CriterionMatchLine {...criterionMatch} />}
    </Box>
);
