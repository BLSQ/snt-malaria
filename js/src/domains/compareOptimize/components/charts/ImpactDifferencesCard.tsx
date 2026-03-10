import React, { FC } from 'react';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import { MenuItem, Select } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { useComparisonDataContext } from '../../ComparisonDataContext';
import { Card } from '../Card';
import { ImpactDifferencesMap } from '../maps/ImpactDifferencesMap';

const styles = {
    metricSelect: {
        fontSize: '0.75rem',
        minWidth: 90,
        '& .MuiSelect-select': {
            paddingTop: '4px',
            paddingBottom: '4px',
        },
    },
} satisfies SxStyles;

export const ImpactDifferencesCard: FC = () => {
    const { isImpactLoading: isLoading } = useComparisonDataContext();
    const { formatMessage } = useSafeIntl();

    // Placeholder for a future feature: allow switching between impact metrics
    const metricDropdown = (
        <Select
            size="small"
            value="deaths"
            sx={styles.metricSelect}
            disabled
        >
            <MenuItem value="deaths">
                {formatMessage(MESSAGES.deaths)}
            </MenuItem>
        </Select>
    );

    return (
        <Card
            title={formatMessage(MESSAGES.impactDifferencesTitle)}
            icon={MapOutlinedIcon}
            bodySx={{
                minHeight: 260,
                display: 'flex',
                flexDirection: 'column',
            }}
            actions={metricDropdown}
            isLoading={isLoading}
        >
            <ImpactDifferencesMap />
        </Card>
    );
};
