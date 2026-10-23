import React, { FC, useMemo } from 'react';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { Link as RouterLink } from 'react-router-dom';
import { userHasPermission } from 'Iaso/domains/users/utils';
import { SxStyles } from 'Iaso/types/general';
import { useCurrentUser } from 'Iaso/utils/usersUtils';
import { WarningBox } from '../../../components/WarningBox';
import { WarningGroup } from '../../../components/WarningGroup';
import { SETTINGS_READ } from '../../../constants/permissions';
import { baseUrls } from '../../../constants/urls';
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
    unmatchedInterventionMixes?: MatchWarningGroup[];
    interventionsWithoutImpactRef?: MatchWarningGroup[];
    providerMeta?: ImpactProviderMeta;
};

export const ImpactWarnings: FC<Props> = ({
    showYearRangeError,
    scenarioYearRanges = [],
    impactYearRange,
    orgUnitsNotFound = [],
    unmatchedInterventionMixes = [],
    interventionsWithoutImpactRef = [],
    providerMeta,
}) => {
    const { formatMessage } = useSafeIntl();
    const currentUser = useCurrentUser();
    const canOpenInterventions = userHasPermission(SETTINGS_READ, currentUser);

    const hasWarnings =
        showYearRangeError ||
        orgUnitsNotFound.length > 0 ||
        unmatchedInterventionMixes.length > 0 ||
        interventionsWithoutImpactRef.length > 0;
    const isFakeProvider = providerMeta?.provider_key === 'fake';
    const unmatchedDistrictCount = useMemo(
        () =>
            new Set(unmatchedInterventionMixes.flatMap(mix => mix.orgUnitNames))
                .size,
        [unmatchedInterventionMixes],
    );

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
                {unmatchedInterventionMixes.length > 0 && (
                    <WarningBox
                        severity="warning"
                        title={formatMessage(
                            MESSAGES.unmatchedInterventionMixesTitle,
                            { count: unmatchedInterventionMixes.length },
                        )}
                        description={formatMessage(
                            MESSAGES.unmatchedInterventionMixes,
                            { count: unmatchedDistrictCount },
                        )}
                    >
                        {unmatchedInterventionMixes.map(mix => (
                            <InterventionWarningGroup
                                key={mix.key}
                                group={mix}
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
                        action={
                            canOpenInterventions && (
                                <Button
                                    component={RouterLink}
                                    to={`/${baseUrls.interventions}`}
                                    variant="text"
                                    color="primary"
                                    size="small"
                                    endIcon={<OpenInNewIcon />}
                                >
                                    {formatMessage(
                                        MESSAGES.setUpInInterventions,
                                    )}
                                </Button>
                            )
                        }
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
