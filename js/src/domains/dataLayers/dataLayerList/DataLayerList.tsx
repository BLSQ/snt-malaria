import React, { FC, Fragment } from 'react';
import { List, ListSubheader, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MetricType, MetricTypeCategory } from '../../planning/types/metrics';
import { MESSAGES } from '../messages';
import { DataLayerLine } from './DataLayerLine';

const styles = {
    category: { color: 'text.primary', px: 0 },
} satisfies SxStyles;

type Props = {
    metricCategories: MetricTypeCategory[];
    onEditMetricType: (metricType: MetricType) => void;
    deleteMetricType: (metricTypeId: number) => void;
};

export const DataLayerList: FC<Props> = ({
    metricCategories,
    onEditMetricType,
    deleteMetricType,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        (metricCategories.length === 0 && (
            <Typography variant="body2" color="textSecondary">
                {formatMessage(MESSAGES.noLayersFound)}
            </Typography>
        )) || (
            <List sx={{ py: 0 }}>
                {metricCategories.map(metricCategory => (
                    <Fragment key={metricCategory.name}>
                        <ListSubheader sx={styles.category}>
                            {metricCategory.name}
                        </ListSubheader>
                        {metricCategory.items.map(metricType => (
                            <DataLayerLine
                                metricType={metricType}
                                key={metricType.id}
                                onEdit={onEditMetricType}
                                onDelete={() => deleteMetricType(metricType.id)}
                                readonly={metricType.origin === 'openhexa'}
                            />
                        ))}
                    </Fragment>
                ))}
            </List>
        )
    );
};
