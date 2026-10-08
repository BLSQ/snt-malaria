import React, { FC } from 'react';
import { Box, Tooltip } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../../constants/overrideColors';
import { MESSAGES } from '../../../../messages';

const styles = {
    dots: {
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        flex: '0 0 auto',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        boxSizing: 'border-box',
    },
    deployedDot: {
        backgroundColor: overrideColors.overriddenBorder,
    },
    notDeployedDot: {
        backgroundColor: overrideColors.emptyDot,
    },
    changedYearDot: {
        backgroundColor: 'transparent',
        boxShadow: `inset 0 0 0 1.5px ${overrideColors.overriddenBorder}`,
    },
} satisfies SxStyles;

type Props = {
    years: number[];
    deployedYears: number[];
    changedYears: number[];
};

const getTooltipMessage = (isDeployed: boolean, isChanged: boolean) => {
    if (isChanged) {
        return isDeployed
            ? MESSAGES.dotDeployedChanged
            : MESSAGES.dotNotDeployedChanged;
    }
    return isDeployed ? MESSAGES.dotDeployed : MESSAGES.dotNotDeployed;
};

export const DeploymentYearDots: FC<Props> = ({
    years,
    deployedYears,
    changedYears,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Box sx={styles.dots}>
            {years.map(year => {
                const isDeployed = deployedYears.includes(year);
                const isChanged = changedYears.includes(year);
                return (
                    <Tooltip
                        key={year}
                        title={formatMessage(
                            getTooltipMessage(isDeployed, isChanged),
                            { year: String(year) },
                        )}
                    >
                        <Box
                            component="span"
                            sx={[
                                styles.dot,
                                isDeployed
                                    ? styles.deployedDot
                                    : styles.notDeployedDot,
                                isChanged && styles.changedYearDot,
                            ]}
                        />
                    </Tooltip>
                );
            })}
        </Box>
    );
};
