import React, { FC } from 'react';
import { Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ColorDot } from '../../../components/ColorDot';
import { WarningBlock } from '../../../components/WarningBlock';
import { MESSAGES } from '../../messages';
import { ScenarioYearRange } from '../types';

const styles = {
    grid: {
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        rowGap: 0.75,
        columnGap: 1,
    },
    label: {
        color: 'text.secondary',
    },
    impactDataLabel: {
        gridColumn: '1 / 3',
    },
    value: {
        fontWeight: 'medium',
        textAlign: 'right',
    },
} satisfies SxStyles;

type Props = {
    scenarioYearRanges: ScenarioYearRange[];
    impactYearRange?: [number, number];
};

export const YearRangeMismatchDetails: FC<Props> = ({
    scenarioYearRanges,
    impactYearRange,
}) => {
    const { formatMessage } = useSafeIntl();

    const formatRange = (range?: [number, number]) => {
        if (!range) return formatMessage(MESSAGES.yearRangeNone);
        const [from, to] = range;
        return from === to ? `${from}` : `${from}–${to}`;
    };

    return (
        <WarningBlock sx={styles.grid}>
            {scenarioYearRanges.map(({ scenario, yearRange }) => (
                <React.Fragment key={scenario.id}>
                    <ColorDot color={scenario.color} />
                    <Typography variant="body2" noWrap sx={styles.label}>
                        {scenario.label}
                    </Typography>
                    <Typography variant="body2" sx={styles.value}>
                        {formatRange(yearRange)}
                    </Typography>
                </React.Fragment>
            ))}
            <Typography
                variant="body2"
                sx={[styles.label, styles.impactDataLabel]}
            >
                {formatMessage(MESSAGES.yearRangeImpactData)}
            </Typography>
            <Typography variant="body2" sx={styles.value}>
                {formatRange(impactYearRange)}
            </Typography>
        </WarningBlock>
    );
};
