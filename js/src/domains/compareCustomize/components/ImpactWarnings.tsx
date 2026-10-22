import React, { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { WarningBox } from '../../../components/WarningBox';
import { WarningGroup } from '../../../components/WarningGroup';
import { MESSAGES } from '../../messages';
import {
    ImpactProviderMeta,
    MatchWarningGroup,
    MatchWarningOrgUnit,
    ScenarioYearRange,
} from '../types';
import { InterventionWarningGroup } from './InterventionWarningGroup';
import { YearRangeMismatchDetails } from './YearRangeMismatchDetails';

const styles = {
    title: {
        typography: 'body1',
        fontWeight: 'medium',
        mt: 2,
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        mt: 2,
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        '&::-webkit-scrollbar': {
            width: 0,
            height: 0,
        },
    },
} satisfies SxStyles;

type Props = {
    showYearRangeError?: boolean;
    scenarioYearRanges?: ScenarioYearRange[];
    impactYearRange?: [number, number];
    orgUnitsNotFound?: MatchWarningOrgUnit[];
    orgUnitsWithUnmatchedInterventions?: MatchWarningOrgUnit[];
    interventionsWithoutImpactRef?: MatchWarningGroup[];
    providerMeta?: ImpactProviderMeta;
};

export const ImpactWarnings: FC<Props> = ({
    showYearRangeError,
    scenarioYearRanges = [],
    impactYearRange,
    orgUnitsNotFound = [],
    orgUnitsWithUnmatchedInterventions = [],
    interventionsWithoutImpactRef = [],
    providerMeta,
}) => {
    const { formatMessage } = useSafeIntl();

    const hasWarnings =
        showYearRangeError ||
        orgUnitsNotFound.length > 0 ||
        orgUnitsWithUnmatchedInterventions.length > 0 ||
        interventionsWithoutImpactRef.length > 0;
    const isFakeProvider = providerMeta?.provider_key === 'fake';

    return (
        <>
            {hasWarnings && (
                <Typography sx={styles.title}>
                    {formatMessage(MESSAGES.warningsTitle)}
                </Typography>
            )}
            <Box sx={styles.list}>
                {showYearRangeError && (
                    <WarningBox
                        severity="error"
                        title={formatMessage(MESSAGES.noYearRangeOverlapTitle)}
                        description={formatMessage(MESSAGES.noYearRangeOverlap)}
                        collapsible={false}
                    >
                        <YearRangeMismatchDetails
                            scenarioYearRanges={scenarioYearRanges}
                            impactYearRange={impactYearRange}
                        />
                    </WarningBox>
                )}
                {orgUnitsNotFound.length > 0 && (
                    <WarningBox
                        severity="warning"
                        title={formatMessage(MESSAGES.orgUnitsNotFoundTitle, {
                            count: orgUnitsNotFound.length,
                        })}
                        description={formatMessage(MESSAGES.orgUnitsNotFound)}
                    >
                        {orgUnitsNotFound.map(orgUnit => (
                            <WarningGroup
                                key={orgUnit.org_unit_id}
                                label={orgUnit.org_unit_name}
                                scenarios={orgUnit.scenarios}
                            />
                        ))}
                    </WarningBox>
                )}
                {orgUnitsWithUnmatchedInterventions.length > 0 && (
                    <WarningBox
                        severity="warning"
                        title={formatMessage(
                            MESSAGES.orgUnitsWithUnmatchedInterventionsTitle,
                            {
                                count: orgUnitsWithUnmatchedInterventions.length,
                            },
                        )}
                        description={formatMessage(
                            MESSAGES.orgUnitsWithUnmatchedInterventions,
                        )}
                    >
                        {orgUnitsWithUnmatchedInterventions.map(orgUnit => (
                            <WarningGroup
                                key={orgUnit.org_unit_id}
                                label={orgUnit.org_unit_name}
                                scenarioColors={orgUnit.scenarios.map(
                                    scenario => scenario.color,
                                )}
                                countLabel={orgUnit.scenarios
                                    .map(scenario => scenario.label)
                                    .join(', ')}
                            />
                        ))}
                    </WarningBox>
                )}
                {interventionsWithoutImpactRef.length > 0 && (
                    <WarningBox
                        severity="warning"
                        title={formatMessage(
                            MESSAGES.interventionsWithoutImpactRefTitle,
                            { count: interventionsWithoutImpactRef.length },
                        )}
                        description={formatMessage(
                            MESSAGES.interventionsWithoutImpactRef,
                        )}
                    >
                        {interventionsWithoutImpactRef.map(intervention => (
                            <InterventionWarningGroup
                                key={intervention.key}
                                group={intervention}
                            />
                        ))}
                    </WarningBox>
                )}
                {isFakeProvider && (
                    <WarningBox
                        severity="info"
                        defaultExpanded
                        title={formatMessage(MESSAGES.fakeProviderInfoTitle)}
                        description={formatMessage(
                            MESSAGES.fakeProviderInfoBody,
                        )}
                    />
                )}
            </Box>
        </>
    );
};
