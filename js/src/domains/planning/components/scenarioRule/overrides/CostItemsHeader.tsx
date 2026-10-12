import React, { FC } from 'react';
import { Box, Tooltip } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { AdaptiveLabel } from '../../../../../components/AdaptiveLabel';
import { MESSAGES } from '../../../../messages';
import {
    getStickyCellStyles,
    OverridesGridSx,
    overridesGridStyles,
} from './overridesGrid';

const ellipsis = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const styles = {
    header: {
        ...overridesGridStyles.rowLayout,
        alignItems: 'end',
        pt: 1.5,
        pb: 0.5,
        borderTop: 1,
        borderColor: 'divider',
        typography: 'caption',
        color: 'text.secondary',
    },
    stickyCell: {
        ...getStickyCellStyles('12px', '4px'),
        display: 'flex',
        alignItems: 'flex-end',
    },
    cell: ellipsis,
    yearCell: {
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
    },
} satisfies SxStyles;

type Props = {
    years: number[];
    gridSx: OverridesGridSx;
};

export const CostItemsHeader: FC<Props> = ({ years, gridSx }) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Box sx={[styles.header, gridSx]}>
            <Box component="span" sx={styles.stickyCell}>
                {formatMessage(MESSAGES.costItemColumn)}
            </Box>
            <Box component="span" sx={styles.cell}>
                {formatMessage(MESSAGES.budgetingCostLineUnitCost)}
            </Box>
            <Box component="span" sx={styles.cell}>
                {formatMessage(MESSAGES.conversionFactorShort)}
            </Box>
            <Box component="span" sx={styles.cell}>
                {formatMessage(MESSAGES.budgetingCostLineBuffer)}
            </Box>
            <Tooltip title={formatMessage(MESSAGES.coverageOrQuantityTooltip)}>
                <Box component="span" sx={styles.cell}>
                    <AdaptiveLabel
                        label={formatMessage(MESSAGES.coverageOrQuantityColumn)}
                        shortLabel={formatMessage(
                            MESSAGES.coverageOrQuantityColumnCompact,
                        )}
                    />
                </Box>
            </Tooltip>
            <span />
            {years.map(year => (
                <Box component="span" key={year} sx={styles.yearCell}>
                    {year}
                </Box>
            ))}
        </Box>
    );
};
