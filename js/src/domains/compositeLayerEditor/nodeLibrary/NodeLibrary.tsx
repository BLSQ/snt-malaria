import React, { FC, Fragment, useMemo, useState } from 'react';
import { Box, List, ListSubheader } from '@mui/material';
import { SearchInput, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { DataLayerLine } from '../../dataLayers/dataLayerList/DataLayerLine';
import { MetricTypeCategory } from '../../dataLayers/types/metrics';
import { MESSAGES } from '../messages';
import { getOperatorLibraryItems } from './operatorLibraryItems';
import { OperatorLibraryLine } from './OperatorLibraryLine';

const styles = {
    search: { px: 2, pt: 2, pb: 1 },
    category: { color: 'text.primary', px: 0 },
} satisfies SxStyles;

type Props = {
    metricCategories: MetricTypeCategory[];
    /** Maps a MetricType id to the composite layer that produced it, when it is a composite. */
    compositeLayerIdByMetricType: Map<number, number>;
    /** The composite layer's own underlying layer, highlighted the same way it is in the plain
     * browsing list. */
    selectedMetricTypeId?: number;
};

const matches = (haystack: string, term: string): boolean =>
    haystack.toLowerCase().includes(term.trim().toLowerCase());

const noop = () => undefined;

/**
 * Searchable, categorized drag-and-drop source for the composite editor canvas: transformation
 * node types (+ Comment) up top, then every data layer category, same grouping as the plain
 * browsing list. Only rendered while the composite editor is open.
 */
export const NodeLibrary: FC<Props> = ({
    metricCategories,
    compositeLayerIdByMetricType,
    selectedMetricTypeId,
}) => {
    const { formatMessage } = useSafeIntl();
    const [searchTerm, setSearchTerm] = useState('');

    const operatorItems = useMemo(
        () => getOperatorLibraryItems(formatMessage),
        [formatMessage],
    );
    const filteredOperatorItems = useMemo(
        () =>
            searchTerm
                ? operatorItems.filter(item => matches(item.label, searchTerm))
                : operatorItems,
        [operatorItems, searchTerm],
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
        <>
            <Box sx={styles.search}>
                <SearchInput
                    label={formatMessage(MESSAGES.searchForNodePlaceholder)}
                    keyValue="nodeLibrarySearch"
                    value={searchTerm}
                    onChange={setSearchTerm}
                    onEnterPressed={noop}
                    clearable
                />
            </Box>
            <List sx={{ py: 0 }}>
                {filteredOperatorItems.length > 0 && (
                    <Fragment>
                        <ListSubheader sx={styles.category}>
                            {formatMessage(MESSAGES.operatorsCategoryLabel)}
                        </ListSubheader>
                        {filteredOperatorItems.map(item => (
                            <OperatorLibraryLine item={item} key={item.type} />
                        ))}
                    </Fragment>
                )}
                {filteredMetricCategories.map(metricCategory => (
                    <Fragment key={metricCategory.name}>
                        <ListSubheader sx={styles.category}>
                            {metricCategory.name}
                        </ListSubheader>
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
                                selected={
                                    metricType.id === selectedMetricTypeId
                                }
                                editing
                            />
                        ))}
                    </Fragment>
                ))}
            </List>
        </>
    );
};
