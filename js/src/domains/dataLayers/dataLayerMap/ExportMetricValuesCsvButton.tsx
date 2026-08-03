import React, { FC } from 'react';
import GetAppIcon from '@mui/icons-material/GetApp';
import { IconButton, Tooltip } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { exportMetricValuesAPIPath } from '../../../constants/api-urls';
import { MESSAGES } from '../messages';
import { MetricType } from '../types/metrics';

type Props = {
    metricType?: MetricType;
    year?: string;
};

export const ExportMetricValuesCsvButton: FC<Props> = ({
    metricType,
    year,
}) => {
    const { formatMessage } = useSafeIntl();

    if (!metricType) {
        return null;
    }

    const params = new URLSearchParams({
        metric_type_ids: metricType.id.toString(),
    });
    if (year && year !== '0') {
        params.set('year', year);
    }
    // Use a plain anchor here, not bluesquare-components' IconButton/react-router Link:
    // react-router prefixes the router's basename onto `to` even for absolute paths,
    // which breaks this same-origin backend URL when a basename is active (e.g. dashboards).
    const url = `${exportMetricValuesAPIPath}?${params.toString()}`;

    return (
        <Tooltip title={formatMessage(MESSAGES.exportCSV)}>
            <IconButton component="a" href={url} download size="medium">
                <GetAppIcon fontSize="medium" />
            </IconButton>
        </Tooltip>
    );
};
