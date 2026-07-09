import React, { FC, Fragment, useEffect, useRef } from 'react';
import { List, ListSubheader, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';
import { MetricType, MetricTypeCategory } from '../types/metrics';
import { DataLayerLine } from './DataLayerLine';

const styles = {
    category: { color: 'text.primary', px: 0 },
} satisfies SxStyles;

type Props = {
    metricCategories: MetricTypeCategory[];
    onSelectMetricType: (metricType?: MetricType) => void;
    /** Currently displayed layer, owned by the parent so selection survives refetches/saves. */
    selectedMetricTypeId?: number;
    onEditMetricType: (metricType: MetricType) => void;
    onEditCompositeLayer: (compositeLayerId: number) => void;
    /** Maps a MetricType id to the composite layer that produced it, when it is a composite. */
    compositeLayerIdByMetricType: Map<number, number>;
    deleteMetricType: (metricTypeId: number) => void;
    /**
     * True while the composite editor is open: rows become drag sources for the canvas, selection
     * is locked to the currently-edited layer, and per-row actions are hidden.
     */
    editing?: boolean;
};

export const DataLayerList: FC<Props> = ({
    metricCategories,
    onSelectMetricType,
    selectedMetricTypeId,
    onEditMetricType,
    onEditCompositeLayer,
    compositeLayerIdByMetricType,
    deleteMetricType,
    editing = false,
}) => {
    const { formatMessage } = useSafeIntl();

    // Auto-select the first layer only on the initial load. Doing it on every `metricCategories`
    // change would clobber the parent's selection whenever the list refetches (e.g. after saving a
    // composite, which should stay displayed). Never auto-select while editing: selection is locked
    // to the layer being edited.
    const hasAutoSelected = useRef(false);
    useEffect(() => {
        if (editing || hasAutoSelected.current) return;
        const firstMetricType = metricCategories[0]?.items[0];
        if (firstMetricType) {
            hasAutoSelected.current = true;
            onSelectMetricType(firstMetricType);
        }
    }, [metricCategories, onSelectMetricType, editing]);
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
                                onClick={() => onSelectMetricType(metricType)}
                                onEdit={onEditMetricType}
                                onEditComposite={onEditCompositeLayer}
                                compositeLayerId={compositeLayerIdByMetricType.get(
                                    metricType.id,
                                )}
                                onDelete={() => deleteMetricType(metricType.id)}
                                selected={
                                    metricType.id === selectedMetricTypeId
                                }
                                editing={editing}
                            />
                        ))}
                    </Fragment>
                ))}
            </List>
        )
    );
};
