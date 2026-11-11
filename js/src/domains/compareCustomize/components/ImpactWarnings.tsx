import React, { FC, useEffect, useMemo } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Theme, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useSafeIntl } from 'bluesquare-components';
import { createPortal } from 'react-dom';
import { Link as RouterLink } from 'react-router-dom';
import { userHasPermission } from 'Iaso/domains/users/utils';
import { SxStyles } from 'Iaso/types/general';
import { useCurrentUser } from 'Iaso/utils/usersUtils';
import { WarningBox } from '../../../components/WarningBox';
import { WarningGroup } from '../../../components/WarningGroup';
import { SETTINGS_READ } from '../../../constants/permissions';
import { baseUrls } from '../../../constants/urls';
import { MESSAGES } from '../../messages';
import { useStickyBottomTitle } from '../hooks/useStickyBottomTitle';
import {
    ImpactProviderMeta,
    MatchWarningGroup,
    MatchWarningOrgUnit,
    ScenarioYearRange,
} from '../types';
import { useConfigurationPanelLayout } from './ConfigurationPanelLayoutContext';
import { InterventionWarningGroup } from './InterventionWarningGroup';
import { YearRangeMismatchDetails } from './YearRangeMismatchDetails';

const TITLE_HEIGHT = 7;
const TITLE_PADDING = 2;
const PINNED_TITLE_VISIBLE_HEIGHT = TITLE_HEIGHT - TITLE_PADDING;

const styles = {
    title: {
        position: 'sticky',
        bottom: theme => theme.spacing(-TITLE_PADDING),
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexShrink: 0,
        boxSizing: 'border-box',
        height: theme => theme.spacing(TITLE_HEIGHT),
        mx: -2,
        px: 2,
        py: TITLE_PADDING,
        typography: 'body1',
        fontWeight: 'medium',
    },
    cutListTitle: {
        cursor: 'pointer',
    },
    cutListIndicator: {
        ml: 'auto',
        color: 'text.secondary',
    },
    count: {
        px: 0.75,
        borderRadius: 1,
        typography: 'caption',
        fontWeight: 'medium',
    },
    errorCount: {
        color: 'error.dark',
        backgroundColor: (theme: Theme) =>
            alpha(theme.palette.error.main, 0.08),
    },
    warningCount: {
        color: 'warning.dark',
        backgroundColor: (theme: Theme) =>
            alpha(theme.palette.warning.main, 0.08),
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
    },
    pinnedTitleBackdrop: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTop: 1,
        borderColor: 'warning.light',
        backgroundColor: 'common.white',
        backgroundImage: (theme: Theme) => {
            const tint = alpha(theme.palette.warning.main, 0.08);
            return `linear-gradient(${tint}, ${tint})`;
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

    const warningCount = [
        showYearRangeError,
        orgUnitsNotFound.length > 0,
        unmatchedInterventionMixes.length > 0,
        interventionsWithoutImpactRef.length > 0,
    ].filter(Boolean).length;
    const hasWarnings = warningCount > 0;

    const theme = useTheme();
    const { scrollContainer, pinnedLayer, setPinnedBottomHeight } =
        useConfigurationPanelLayout();
    const {
        titleRef,
        titleEndRef,
        contentEndRef,
        backdropRef,
        isTitlePinned,
        isContentCut,
        scrollToTitle,
    } = useStickyBottomTitle(scrollContainer, hasWarnings);

    useEffect(() => {
        if (!hasWarnings) return undefined;
        setPinnedBottomHeight(theme.spacing(PINNED_TITLE_VISIBLE_HEIGHT));
        return () => setPinnedBottomHeight(undefined);
    }, [hasWarnings, setPinnedBottomHeight, theme]);

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
                <Typography
                    ref={titleRef}
                    sx={[styles.title, isContentCut && styles.cutListTitle]}
                    onClick={isContentCut ? scrollToTitle : undefined}
                >
                    {formatMessage(MESSAGES.warningsTitle)}
                    {isContentCut && (
                        <Box
                            component="span"
                            sx={[
                                styles.count,
                                showYearRangeError
                                    ? styles.errorCount
                                    : styles.warningCount,
                            ]}
                        >
                            {warningCount}
                        </Box>
                    )}
                    {isContentCut && (
                        <KeyboardArrowDownIcon sx={styles.cutListIndicator} />
                    )}
                </Typography>
            )}
            {hasWarnings && <Box ref={titleEndRef} />}
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
            {hasWarnings && <Box ref={contentEndRef} />}
            {isTitlePinned &&
                pinnedLayer &&
                createPortal(
                    <Box ref={backdropRef} sx={styles.pinnedTitleBackdrop} />,
                    pinnedLayer,
                )}
        </>
    );
};
