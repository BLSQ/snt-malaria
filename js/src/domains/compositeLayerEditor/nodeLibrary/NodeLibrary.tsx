import React, { FC, Fragment, useEffect, useMemo, useRef } from 'react';
import { List } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { StickyListSubheader } from '../../../components/styledComponents';
import { DataLayerLine } from '../../dataLayers/dataLayerList/DataLayerLine';
import { MetricTypeCategory } from '../../dataLayers/types/metrics';
import { useNodeLibraryGroups } from './nodeLibraryGroups';
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

    // The browsing list shares this scroll container, so its offset would carry over and hide the
    // first categories.
    const listRef = useRef<HTMLUListElement>(null);
    useEffect(() => {
        listRef.current?.closest('.MuiCardContent-root')?.scrollTo({ top: 0 });
    }, []);

    const nodeLibraryGroups = useNodeLibraryGroups(formatMessage);

    // Empty categories drop out, heading included.
    const nodeGroups = useMemo(
        () =>
            nodeLibraryGroups
                .map(group => ({
                    ...group,
                    items: searchTerm
                        ? group.items.filter(item =>
                              matches(item.label, searchTerm),
                          )
                        : group.items,
                }))
                .filter(group => group.items.length > 0),
        [nodeLibraryGroups, searchTerm],
    );

    const filteredMetricCategories = useMemo(
        () =>
            metricCategories
                .map(category => ({
                    ...category,
                    items: category.items.filter(
                        item =>
                            item.id !== selectedMetricTypeId &&
                            (searchTerm
                                ? matches(item.name, searchTerm)
                                : true),
                    ),
                }))
                .filter(category => category.items.length > 0),
        [metricCategories, searchTerm, selectedMetricTypeId],
    );

    return (
        <List sx={{ py: 0 }} ref={listRef}>
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
                            editing
                        />
                    ))}
                </Fragment>
            ))}
        </List>
    );
};
