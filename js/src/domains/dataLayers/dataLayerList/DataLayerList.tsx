import React, { FC, Fragment, useCallback, useEffect } from 'react';
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
    onSelectMetricType: (metricType?: MetricType) => void;
    onEditMetricType: (metricType: MetricType) => void;
    deleteMetricType: (metricTypeId: number) => void;
};

export const DataLayerList: FC<Props> = ({
    metricCategories,
    onSelectMetricType,
    onEditMetricType,
    deleteMetricType,
}) => {
    const { formatMessage } = useSafeIntl();
    const [selectedMetricTypeId, setSelectedMetricTypeId] = React.useState<
        number | null
    >(null);

    const handleSelectMetricType = useCallback(
        (metricType: MetricType) => {
            setSelectedMetricTypeId(metricType.id);
            onSelectMetricType(metricType);
        },
        [onSelectMetricType],
    );

    useEffect(() => {
        if (metricCategories.length > 0) {
            const firstMetricType = metricCategories[0].items[0];
            if (firstMetricType) {
                handleSelectMetricType(firstMetricType);
            }
        }
    }, [metricCategories, handleSelectMetricType]);
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
                                onClick={() =>
                                    handleSelectMetricType(metricType)
                                }
                                onEdit={onEditMetricType}
                                onDelete={() => deleteMetricType(metricType.id)}
                                readonly={metricType.origin === 'openhexa'}
                                selected={
                                    metricType.id === selectedMetricTypeId
                                }
                            />
                        ))}
                    </Fragment>
                ))}
            </List>
        )
    );
};
