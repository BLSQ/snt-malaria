import React, { FC } from 'react';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { HighlightChip } from '../../../../components/HighlightChip';
import { baseUrls } from '../../../../constants/urls';
import { MESSAGES } from '../../../messages';
import { getRuleDisplayName } from '../../../planning/libs/rule-utils';
import { useGetInterventionCategories } from '../../hooks/useGetInterventionCategories';
import {
    InterventionCategory,
    InterventionUsageRule,
    InterventionUsageScenario,
} from '../../types';

const OPEN_SCENARIO_LINK_CLASS = 'openScenarioLink';

type Props = {
    scenarios: InterventionUsageScenario[];
};

const styles = {
    list: {
        gap: 1,
        maxHeight: 352,
        overflowY: 'auto',
        pr: 0.5,
    },
    scenarioCard: {
        flexShrink: 0,
        gap: 0.75,
        px: 2,
        py: 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        [`&:hover .${OPEN_SCENARIO_LINK_CLASS}, &:focus-within .${OPEN_SCENARIO_LINK_CLASS}`]:
            {
                visibility: 'visible',
            },
    },
    scenarioName: {
        fontWeight: 'medium',
        lineHeight: 1.25,
    },
    openScenarioLink: {
        visibility: 'hidden',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        typography: 'body2',
        fontWeight: 'medium',
        textDecoration: 'none',
    },
    rules: {
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 0.75,
    },
} satisfies SxStyles;

type RuleChipProps = {
    rule: InterventionUsageRule;
    interventionCategories: InterventionCategory[];
};

const RuleChip: FC<RuleChipProps> = ({ rule, interventionCategories }) => (
    <HighlightChip
        variant="outlined"
        dotColor={rule.color}
        label={getRuleDisplayName(rule, interventionCategories)}
    />
);

export const InterventionUsageList: FC<Props> = ({ scenarios }) => {
    const { formatMessage } = useSafeIntl();
    const { data: interventionCategories = [] } =
        useGetInterventionCategories();
    return (
        <Stack
            tabIndex={0}
            aria-label={formatMessage(
                MESSAGES.deleteInterventionUsedInActiveScenarios,
            )}
            sx={styles.list}
        >
            {scenarios.map(scenario => (
                <Stack key={scenario.id} sx={styles.scenarioCard}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={1}
                    >
                        <Typography
                            variant="subtitle1"
                            sx={styles.scenarioName}
                        >
                            {scenario.name}
                        </Typography>
                        <Link
                            href={`/dashboard/${baseUrls.planning}/scenarioId/${scenario.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={OPEN_SCENARIO_LINK_CLASS}
                            sx={styles.openScenarioLink}
                        >
                            {formatMessage(
                                MESSAGES.deleteInterventionOpenScenario,
                            )}
                            <OpenInNewIcon fontSize="inherit" />
                        </Link>
                    </Stack>
                    <Stack direction="row" sx={styles.rules}>
                        <Typography variant="caption" color="text.secondary">
                            {formatMessage(MESSAGES.deleteInterventionInRules)}
                        </Typography>
                        {scenario.rules.map(rule => (
                            <RuleChip
                                key={rule.id}
                                rule={rule}
                                interventionCategories={interventionCategories}
                            />
                        ))}
                    </Stack>
                </Stack>
            ))}
        </Stack>
    );
};
