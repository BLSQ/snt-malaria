import React, { FC, Fragment, useMemo } from 'react';
import { List } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { StickyListSubheader } from '../../../components/styledComponents';
import { DataLayerLine } from '../../dataLayers/dataLayerList/DataLayerLine';
import { MetricTypeCategory } from '../../dataLayers/types/metrics';
import { getNodeLibraryGroups } from './nodeLibraryGroups';
import { NodeLibraryLine } from './NodeLibraryLine';

type Props = {
    metricCategories: MetricTypeCategory[];
    /** Maps a MetricType id to the composite layer that produced it, when it is a composite. */
    compositeLayerIdByMetricType: Map<number, number>;
    /** The composite layer's own underlying layer, highlighted as in the browsing list. */
    selectedMetricTypeId?: number;
    /** Filter from `NodeLibrarySearch`, which lives in the card header. */
    searchTerm: string;
};

const matches = (haystack: string, term: string): boolean =>
    haystack.toLowerCase().includes(term.trim().toLowerCase());

const noop = () => undefined;

/**
 * Drag-and-drop source for the composite editor canvas: the library's own categories first, then
 * the data layer ones. Only rendered while the editor is open.
 */
export const NodeLibrary: FC<Props> = ({
    metricCategories,
    compositeLayerIdByMetricType,
    selectedMetricTypeId,
    searchTerm,
}) => {
    const { formatMessage } = useSafeIntl();

    // Empty categories drop out, heading included.
    const nodeGroups = useMemo(
        () =>
            getNodeLibraryGroups(formatMessage)
                .map(group => ({
                    ...group,
                    items: searchTerm
                        ? group.items.filter(item =>
                              matches(item.label, searchTerm),
                          )
                        : group.items,
                }))
                .filter(group => group.items.length > 0),
        [formatMessage, searchTerm],
    );

    const filteredMetricCategories = useMemo(
        () =>
            (searchTerm
                ? metricCategories.map(category => ({
                      ...category,
                      items: category.items.filter(item =>
                          matches(item.name, searchTerm),
                      ),
                  }))
                : metricCategories
            ).filter(category => category.items.length > 0),
        [metricCategories, searchTerm],
    );

    return (
        <List sx={{ py: 0 }}>
            {nodeGroups.map(group => (
                <Fragment key={group.label}>
                    <StickyListSubheader>{group.label}</StickyListSubheader>
                    {group.items.map(item => (
                        <NodeLibraryLine item={item} key={item.type} />
                    ))}
                </Fragment>
            ))}
            {filteredMetricCategories.map(metricCategory => (
                <Fragment key={metricCategory.name}>
                    <StickyListSubheader>
                        {metricCategory.name}
                    </StickyListSubheader>
                    {metricCategory.items.map(metricType => (
                        <DataLayerLine
                            metricType={metricType}
                            key={metricType.id}
                            onClick={noop}
                            onEdit={noop}
                            onDelete={noop}
                            compositeLayerId={compositeLayerIdByMetricType.get(
                                metricType.id,
                            )}
                            selected={metricType.id === selectedMetricTypeId}
                            editing
                        />
                    ))}
                </Fragment>
            ))}
        </List>
    );
};
