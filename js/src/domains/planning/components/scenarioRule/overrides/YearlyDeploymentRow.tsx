import React, { FC, useCallback } from 'react';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { Box, Button, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../../constants/overrideColors';
import { MESSAGES } from '../../../../messages';
import { hasYearValue, setDeploymentYears } from '../../../libs/override-utils';
import { RuleInterventionOverride } from '../../../types/scenarioRule';
import { DeploymentYearToggle } from './DeploymentYearToggle';
import {
    getStickyCellStyles,
    OVERRIDES_HOVER_ROW_CLASS,
    OverridesGridSx,
    overridesGridStyles,
} from './overridesGrid';

const styles = {
    row: {
        ...overridesGridStyles.row,
        py: 1.5,
    },
    label: {
        ...getStickyCellStyles('12px'),
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: 0,
    },
    text: { minWidth: 0, flex: '1 1 auto' },
    summary: {
        color: 'text.secondary',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    changedSummary: {
        color: overrideColors.overriddenText,
        fontWeight: 'medium',
    },
    selectAllCell: {
        display: 'flex',
        justifyContent: 'flex-end',
        minWidth: 0,
    },
} satisfies SxStyles;

type Props = {
    override: RuleInterventionOverride;
    years: number[];
    deployedYears: number[];
    gridSx: OverridesGridSx;
    onChange: (next: RuleInterventionOverride) => void;
};

export const YearlyDeploymentRow: FC<Props> = ({
    override,
    years,
    deployedYears,
    gridSx,
    onChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const isEveryYearDeployed = deployedYears.length === years.length;

    const handleToggleYear = useCallback(
        (year: number) => {
            const nextYears = deployedYears.includes(year)
                ? deployedYears.filter(deployedYear => deployedYear !== year)
                : [...deployedYears, year];
            onChange(setDeploymentYears(override, nextYears, years));
        },
        [deployedYears, override, onChange, years],
    );

    const handleToggleAllYears = useCallback(
        () =>
            onChange(
                setDeploymentYears(
                    override,
                    isEveryYearDeployed ? [] : years,
                    years,
                ),
            ),
        [isEveryYearDeployed, override, onChange, years],
    );

    let summary = formatMessage(MESSAGES.deploymentEveryYear);
    if (deployedYears.length === 0) {
        summary = formatMessage(MESSAGES.deploymentNoYears);
    } else if (!isEveryYearDeployed) {
        summary = formatMessage(MESSAGES.deploymentSomeYears, {
            count: String(deployedYears.length),
            total: String(years.length),
        });
    }

    return (
        <Box className={OVERRIDES_HOVER_ROW_CLASS} sx={[styles.row, gridSx]}>
            <Box sx={styles.label}>
                <Box component="span" sx={overridesGridStyles.tile}>
                    <EventAvailableIcon sx={overridesGridStyles.smallIcon} />
                </Box>
                <Box sx={styles.text}>
                    <Typography variant="body2" fontWeight="medium" noWrap>
                        {formatMessage(MESSAGES.yearlyDeployment)}
                    </Typography>
                    <Typography
                        variant="caption"
                        component="div"
                        sx={[
                            styles.summary,
                            !isEveryYearDeployed && styles.changedSummary,
                        ]}
                    >
                        {summary}
                    </Typography>
                </Box>
            </Box>
            <span />
            <span />
            <span />
            <span />
            <Box sx={styles.selectAllCell}>
                <Button
                    size="small"
                    onClick={handleToggleAllYears}
                    sx={overridesGridStyles.textAction}
                >
                    {formatMessage(
                        isEveryYearDeployed
                            ? MESSAGES.selectNone
                            : MESSAGES.selectAllYears,
                    )}
                </Button>
            </Box>
            {years.map(year => (
                <DeploymentYearToggle
                    key={year}
                    year={year}
                    isDeployed={deployedYears.includes(year)}
                    hasCostItemValue={hasYearValue(override, year)}
                    onToggle={handleToggleYear}
                />
            ))}
        </Box>
    );
};
