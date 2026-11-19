import React, { FC, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { hoverCardSpacing } from '../../../../components/hoverCard/hoverCardSpacing';
import {
    TooltipChip,
    TooltipChipList,
} from '../../../../components/hoverCard/TooltipChip';
import { Intervention } from '../../../interventions/types/intervention';
import { MESSAGES } from '../../../messages';
import { getScenarioTagColors } from '../../utils/colors';
import {
    buildInterventionMixDiff,
    InterventionMixChange,
} from '../../utils/interventionMixDiff';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: hoverCardSpacing.labelToContent,
    },
} satisfies SxStyles;

const SIGNS: Partial<Record<InterventionMixChange, string>> = {
    added: '+',
    removed: '−',
};

type Props = {
    interventions: Intervention[];
    /** Set on a scenario compared to a baseline: interventions are marked added or removed. */
    baselineInterventions?: Intervention[];
    /** Colour of the scenario, used for the interventions it adds. */
    scenarioColor: string;
};

export const InterventionMixTooltipBody: FC<Props> = ({
    interventions,
    baselineInterventions,
    scenarioColor,
}) => {
    const { formatMessage } = useSafeIntl();
    const items = useMemo(
        () => buildInterventionMixDiff(interventions, baselineInterventions),
        [interventions, baselineInterventions],
    );
    const addedTint = getScenarioTagColors(scenarioColor);

    return (
        <Box sx={styles.root}>
            <Typography variant="caption" color="text.secondary">
                {formatMessage(
                    baselineInterventions
                        ? MESSAGES.tooltipInterventionMixVsBaseline
                        : MESSAGES.tooltipInterventionMix,
                )}
            </Typography>
            {items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {formatMessage(MESSAGES.tooltipInterventionCount, {
                        count: String(0),
                    })}
                </Typography>
            ) : (
                <TooltipChipList>
                    {items.map(item => (
                        <TooltipChip
                            key={`${item.change}-${item.id}`}
                            label={item.label}
                            sign={SIGNS[item.change]}
                            tint={
                                item.change === 'added' ? addedTint : undefined
                            }
                            struck={item.change === 'removed'}
                        />
                    ))}
                </TooltipChipList>
            )}
        </Box>
    );
};
