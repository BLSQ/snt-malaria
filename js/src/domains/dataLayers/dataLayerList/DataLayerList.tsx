import React, { FC, Fragment, useEffect, useRef } from 'react';
import { List, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { StickyListSubheader } from '../../../components/styledComponents';
import { OpenHexaImportStatusByMetricType } from '../hooks/useGetOpenHexaImportStatus';
import { MESSAGES } from '../messages';
import { MetricType, MetricTypeCategory } from '../types/metrics';
import { DataLayerLine } from './DataLayerLine';

type Props = {
    metricCategories: MetricTypeCategory[];
    onSelectMetricType: (metricType?: MetricType) => void;
    /** Currently displayed layer, owned by the parent so selection survives refetches/saves. */
    selectedMetricTypeId?: number;
    onEditMetricType: (metricType: MetricType) => void;
    /** Maps a MetricType id to the composite layer that produced it, when it is a composite. */
    compositeLayerIdByMetricType: Map<number, number>;
    deleteMetricType: (metricTypeId: number) => void;
    /** Re-run the OpenHexa value import for an openhexa-origin layer. */
    onRefreshOpenHexaLayer: (metricType: MetricType) => void;
    /** Latest value-import task status, keyed by metric type id. */
    openHexaImportStatus?: OpenHexaImportStatusByMetricType;
};

export const DataLayerList: FC<Props> = ({
    metricCategories,
    onSelectMetricType,
    selectedMetricTypeId,
    onEditMetricType,
    compositeLayerIdByMetricType,
    deleteMetricType,
    onRefreshOpenHexaLayer,
    openHexaImportStatus,
}) => {
    const { formatMessage } = useSafeIntl();

    // Auto-select the first layer only on the initial load. Doing it on every `metricCategories`
    // change would clobber the parent's selection whenever the list refetches (e.g. after saving a
    // composite, which should stay displayed).
    const hasAutoSelected = useRef(false);
    useEffect(() => {
        if (hasAutoSelected.current) return;
        const firstMetricType = metricCategories[0]?.items[0];
        if (firstMetricType) {
            hasAutoSelected.current = true;
            onSelectMetricType(firstMetricType);
        }
    }, [metricCategories, onSelectMetricType]);
    return (
        (metricCategories.length === 0 && (
            <Typography variant="body2" color="textSecondary">
                {formatMessage(MESSAGES.noLayersFound)}
            </Typography>
        )) || (
            <List sx={{ py: 0 }}>
                {metricCategories.map(metricCategory => (
                    <Fragment key={metricCategory.name}>
                        <StickyListSubheader>
                            {metricCategory.name}
                        </StickyListSubheader>
                        {metricCategory.items.map(metricType => (
                            <DataLayerLine
                                metricType={metricType}
                                key={metricType.id}
                                onClick={() => onSelectMetricType(metricType)}
                                onEdit={onEditMetricType}
                                compositeLayerId={compositeLayerIdByMetricType.get(
                                    metricType.id,
                                )}
                                onDelete={() => deleteMetricType(metricType.id)}
                                onRefreshOpenHexaLayer={onRefreshOpenHexaLayer}
                                importStatus={
                                    openHexaImportStatus?.[metricType.id]
                                }
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
