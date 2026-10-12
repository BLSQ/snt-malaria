import React, { FC, useCallback } from 'react';
import { Box, Tooltip } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../../constants/overrideColors';
import { MESSAGES } from '../../../../messages';
import { overridesGridStyles } from './overridesGrid';

const styles = {
    changedYearCell: { borderStyle: 'dashed' },
    changedNotDeployedYearCell: {
        borderColor: overrideColors.overriddenBorder,
    },
} satisfies SxStyles;

type Props = {
    year: number;
    isDeployed: boolean;
    hasCostItemValue: boolean;
    onToggle: (year: number) => void;
};

export const DeploymentYearToggle: FC<Props> = ({
    year,
    isDeployed,
    hasCostItemValue,
    onToggle,
}) => {
    const { formatMessage } = useSafeIntl();
    const handleClick = useCallback(() => onToggle(year), [onToggle, year]);
    return (
        <Tooltip
            title={formatMessage(
                isDeployed
                    ? MESSAGES.yearDeployedTooltip
                    : MESSAGES.yearNotDeployedTooltip,
                { year: String(year) },
            )}
        >
            <Box
                component="button"
                type="button"
                onClick={handleClick}
                sx={[
                    overridesGridStyles.yearCell,
                    isDeployed && overridesGridStyles.selectedYearCell,
                    hasCostItemValue && styles.changedYearCell,
                    hasCostItemValue &&
                        !isDeployed &&
                        styles.changedNotDeployedYearCell,
                ]}
            >
                {year}
            </Box>
        </Tooltip>
    );
};
