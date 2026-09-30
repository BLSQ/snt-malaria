import React, {
    FC,
    Fragment,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Collapse, List, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
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
    onEditComposite: (compositeLayerId: number) => void;
    deleteMetricType: (metricTypeId: number) => void;
    /** Re-run the OpenHexa value import for an openhexa-origin layer. */
    onRefreshOpenHexaLayer: (metricType: MetricType) => void;
    /** Latest value-import task status, keyed by metric type id. */
    openHexaImportStatus?: OpenHexaImportStatusByMetricType;
};

const styles: SxStyles = {
    categoryHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        cursor: 'pointer',
        userSelect: 'none',
    },
};

export const DataLayerList: FC<Props> = ({
    metricCategories,
    onSelectMetricType,
    selectedMetricTypeId,
    onEditMetricType,
    compositeLayerIdByMetricType,
    onEditComposite,
    deleteMetricType,
    onRefreshOpenHexaLayer,
    openHexaImportStatus,
}) => {
    const { formatMessage } = useSafeIntl();

    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
        () => new Set(),
    );
    const toggleCategory = useCallback((categoryName: string) => {
        setCollapsedCategories(previous => {
            const next = new Set(previous);
            if (next.has(categoryName)) {
                next.delete(categoryName);
            } else {
                next.add(categoryName);
            }
            return next;
        });
    }, []);

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

    const rowNodes = useRef(new Map<number, HTMLLIElement>());
    const setRowRef = useCallback(
        (metricTypeId: number, node: HTMLLIElement | null) => {
            if (node) {
                rowNodes.current.set(metricTypeId, node);
            } else {
                rowNodes.current.delete(metricTypeId);
            }
        },
        [],
    );

    // Reveal the selected layer whenever the selection changes, e.g. right after the wizard
    // creates a new one, in case it's off-screen or its category is collapsed. Deliberately keyed
    // only on `selectedMetricTypeId`, not `metricCategories`/`collapsedCategories`, so a background
    // refetch doesn't re-trigger the scroll.
    useEffect(() => {
        if (selectedMetricTypeId === undefined) return undefined;
        const category = metricCategories.find(metricCategory =>
            metricCategory.items.some(item => item.id === selectedMetricTypeId),
        );
        const wasCollapsed = category
            ? collapsedCategories.has(category.name)
            : false;
        if (category && wasCollapsed) {
            toggleCategory(category.name);
        }
        const timeoutId = window.setTimeout(
            () => {
                rowNodes.current
                    .get(selectedMetricTypeId)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            },
            wasCollapsed ? 300 : 0,
        );
        return () => window.clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMetricTypeId]);
    return (
        (metricCategories.length === 0 && (
            <Typography variant="body2" color="textSecondary">
                {formatMessage(MESSAGES.noLayersFound)}
            </Typography>
        )) || (
            <List sx={{ py: 0 }}>
                {metricCategories.map(metricCategory => {
                    const isCollapsed = collapsedCategories.has(
                        metricCategory.name,
                    );
                    return (
                        <Fragment key={metricCategory.name}>
                            <StickyListSubheader
                                onClick={() =>
                                    toggleCategory(metricCategory.name)
                                }
                            >
                                <Box
                                    sx={styles.categoryHeader}
                                    role="button"
                                    aria-expanded={!isCollapsed}
                                    aria-label={formatMessage(
                                        isCollapsed
                                            ? MESSAGES.expandCategory
                                            : MESSAGES.collapseCategory,
                                    )}
                                >
                                    {metricCategory.name}
                                    {isCollapsed ? (
                                        <ExpandMoreIcon fontSize="small" />
                                    ) : (
                                        <ExpandLessIcon fontSize="small" />
                                    )}
                                </Box>
                            </StickyListSubheader>
                            <Collapse in={!isCollapsed} timeout="auto">
                                {metricCategory.items.map(metricType => (
                                    <DataLayerLine
                                        metricType={metricType}
                                        key={metricType.id}
                                        onClick={() =>
                                            onSelectMetricType(metricType)
                                        }
                                        onEdit={onEditMetricType}
                                        compositeLayerId={compositeLayerIdByMetricType.get(
                                            metricType.id,
                                        )}
                                        onEditComposite={onEditComposite}
                                        onDelete={() =>
                                            deleteMetricType(metricType.id)
                                        }
                                        onRefreshOpenHexaLayer={
                                            onRefreshOpenHexaLayer
                                        }
                                        importStatus={
                                            openHexaImportStatus?.[
                                                metricType.id
                                            ]
                                        }
                                        selected={
                                            metricType.id ===
                                            selectedMetricTypeId
                                        }
                                        onRowRef={node =>
                                            setRowRef(metricType.id, node)
                                        }
                                    />
                                ))}
                            </Collapse>
                        </Fragment>
                    );
                })}
            </List>
        )
    );
};
