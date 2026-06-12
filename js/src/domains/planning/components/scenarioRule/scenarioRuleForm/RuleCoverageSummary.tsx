import React, { FC, useMemo } from 'react';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { Box, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../../messages';
import { useGetAccountSettings } from '../../../hooks/useGetAccountSettings';
import { useGetOrgUnits } from '../../../hooks/useGetOrgUnits';
import { usePopulationByOrgUnit } from '../../../hooks/usePopulationByOrgUnit';
import { formatBigNumber } from '../../../libs/cost-utils';

const styles = {
    widget: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        backgroundColor: 'grey.100',
        borderRadius: 3,
    },
    widgetIcon: {
        color: 'primary.main',
    },
    widgetLabel: {
        color: 'text.secondary',
    },
    loading: {
        opacity: 0.5,
        transition: 'opacity 0.2s',
    },
} satisfies SxStyles;

const formatCount = (value: number): string =>
    value >= 1000 ? formatBigNumber(value) : Math.round(value).toString();

const formatPercentOfTotal = (value: number, total?: number): string => {
    if (!total) {
        return '';
    }
    const percent = (value / total) * 100;
    if (value > 0 && percent < 1) {
        return ' (<1%)';
    }
    return ` (${Math.round(percent)}%)`;
};

type WidgetProps = {
    icon: React.ElementType;
    label: string;
    value?: number;
    total?: number;
    isLoading?: boolean;
};

const RuleCoverageWidget: FC<WidgetProps> = ({
    icon: Icon,
    label,
    value,
    total,
    isLoading,
}) => (
    <Box
        sx={isLoading ? { ...styles.widget, ...styles.loading } : styles.widget}
    >
        <Icon fontSize="medium" sx={styles.widgetIcon} />
        <Box>
            <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.3}>
                {value !== undefined ? formatCount(value) : '-'}
                {value !== undefined && (
                    <Typography component="span" variant="subtitle1">
                        {formatPercentOfTotal(value, total)}
                    </Typography>
                )}
            </Typography>
            <Typography variant="caption" sx={styles.widgetLabel}>
                {label}
            </Typography>
        </Box>
    </Box>
);

type Props = {
    matchedOrgUnitIds?: number[];
    isLoadingPreview?: boolean;
};

export const RuleCoverageSummary: FC<Props> = ({
    matchedOrgUnitIds,
    isLoadingPreview,
}) => {
    const { formatMessage } = useSafeIntl();
    const populationByOrgUnit = usePopulationByOrgUnit();

    // Same request as the form/map (same query key), so this is a cache hit.
    const { data: accountSettings } = useGetAccountSettings();
    const interventionTypeId = accountSettings?.intervention_org_unit_type_id;
    const { data: allOrgUnits } = useGetOrgUnits({
        orgUnitTypeId: interventionTypeId,
        enabled: !!interventionTypeId,
    });

    const totalPopulation = useMemo(() => {
        if (!populationByOrgUnit) {
            return undefined;
        }
        return (matchedOrgUnitIds ?? []).reduce(
            (total, orgUnitId) =>
                total + (populationByOrgUnit.get(orgUnitId) ?? 0),
            0,
        );
    }, [populationByOrgUnit, matchedOrgUnitIds]);

    const overallPopulation = useMemo(() => {
        if (!populationByOrgUnit || !allOrgUnits) {
            return undefined;
        }
        return allOrgUnits.reduce(
            (total, orgUnit) =>
                total + (populationByOrgUnit.get(orgUnit.id) ?? 0),
            0,
        );
    }, [populationByOrgUnit, allOrgUnits]);

    return (
        <Box mt={3}>
            <Typography variant="body2" fontWeight="medium" mb={1}>
                {formatMessage(MESSAGES.ruleCoverage)}
            </Typography>
            <Stack direction="row" spacing={2}>
                <RuleCoverageWidget
                    icon={GroupsOutlinedIcon}
                    label={formatMessage(MESSAGES.ruleCoveragePopulation)}
                    value={totalPopulation}
                    total={overallPopulation}
                    isLoading={isLoadingPreview}
                />
                <RuleCoverageWidget
                    icon={PlaceOutlinedIcon}
                    label={formatMessage(MESSAGES.ruleCoverageDistricts)}
                    value={matchedOrgUnitIds?.length ?? 0}
                    total={allOrgUnits?.length}
                    isLoading={isLoadingPreview}
                />
            </Stack>
        </Box>
    );
};
