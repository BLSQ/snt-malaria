import React, { FC, useCallback, useMemo, useState } from 'react';
import {
    CloudOff,
    ErrorOutline,
    Search as SearchIcon,
} from '@mui/icons-material';
import { Box, Button, Typography, alpha, useTheme } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../../../messages';
import { MetricTypeCriterion } from '../../../../types/scenarioRule';
import { ScopeTreeRow } from './ScopeTreeRow';
import {
    buildVisibleRows,
    computeAggregates,
    computeKeepForQuery,
    leafKind,
    pickLeaves,
    restoreLeaves,
    sumAggregates,
    unpickLeaves,
} from './scopeTreeUtils';
import { ScopeAggregate } from './types';
import { useOrgUnitScopeTree } from './useOrgUnitScopeTree';
import { useRuleMatchedOrgUnits } from './useRuleMatchedOrgUnits';

const EMPTY_AGGREGATE: ScopeAggregate = {
    total: 0,
    rule: 0,
    hand: 0,
    exc: 0,
    scope: 0,
};

const styles = {
    headerRow: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 2,
        mb: 1.25,
    },
    scopeLine: {
        fontSize: '12px',
        color: 'text.secondary',
    },
    box: {
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'common.white',
    },
    searchRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 1.25,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
    },
    searchInput: {
        flex: 1,
        border: 0,
        outline: 'none',
        background: 'transparent',
        font: '400 14px Roboto, sans-serif',
        color: 'text.primary',
    },
    resultLine: {
        fontSize: '12px',
        color: 'text.secondary',
        whiteSpace: 'nowrap',
    },
    treeScroll: {
        maxHeight: '360px',
        overflow: 'auto',
    },
    footer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        px: 1.25,
        py: 0.75,
        borderTop: 1,
        borderColor: 'divider',
    },
    centeredMessage: {
        textAlign: 'center',
        p: 2,
    },
    previewError: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.25,
        border: 1,
        borderColor: theme => alpha(theme.palette.error.main, 0.5),
        borderRadius: 1,
        backgroundColor: theme => alpha(theme.palette.error.main, 0.07),
        p: 1.5,
        mb: 1.5,
    },
} satisfies SxStyles;

type Props = {
    interventionTypeId?: number;
    matchingCriteria: MetricTypeCriterion[];
    dataLayerYears?: Record<string, number>;
    excludedIds: number[];
    handpickedIds: number[];
    onChangeExcluded: (ids: number[]) => void;
    onChangeHandpicked: (ids: number[]) => void;
};

export const OrgUnitScopeSelector: FC<Props> = ({
    interventionTypeId,
    matchingCriteria,
    dataLayerYears,
    excludedIds,
    handpickedIds,
    onChangeExcluded,
    onChangeHandpicked,
}) => {
    const theme = useTheme();
    const { formatMessage } = useSafeIntl();

    const {
        tree,
        isLoading: isLoadingTree,
        isError: isTreeError,
        refetch: refetchTree,
    } = useOrgUnitScopeTree(interventionTypeId);
    const {
        ruleMatchedIds,
        isLoading: isLoadingRule,
        isError: isRuleError,
        retry: retryRule,
    } = useRuleMatchedOrgUnits({
        matchingCriteria,
        dataLayerYears,
    });

    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [query, setQuery] = useState('');

    const ruleIds = useMemo(
        () => new Set(ruleMatchedIds ?? []),
        [ruleMatchedIds],
    );
    const handIds = useMemo(() => new Set(handpickedIds), [handpickedIds]);
    const excIds = useMemo(() => new Set(excludedIds), [excludedIds]);

    const aggregates = useMemo(
        () =>
            tree
                ? computeAggregates(
                      tree.leafIdsByAncestor,
                      ruleIds,
                      handIds,
                      excIds,
                  )
                : new Map(),
        [tree, ruleIds, handIds, excIds],
    );

    const rootAggregate = useMemo(
        () =>
            tree ? sumAggregates(tree.rootIds, aggregates) : EMPTY_AGGREGATE,
        [tree, aggregates],
    );

    const keep = useMemo(
        () => (tree ? computeKeepForQuery(tree, query) : null),
        [tree, query],
    );

    const rows = useMemo(
        () => (tree ? buildVisibleRows(tree, expanded, keep) : []),
        [tree, expanded, keep],
    );

    const handleToggleOpen = useCallback((nodeId: number) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    const handleRowClick = useCallback(
        (nodeId: number, isLeaf: boolean) => {
            if (!tree) return;
            const leafIds = tree.leafIdsByAncestor.get(nodeId) ?? [];
            if (isLeaf) {
                const kind = leafKind(nodeId, ruleIds, handIds, excIds);
                if (kind === 'exc') {
                    onChangeExcluded(
                        Array.from(restoreLeaves(leafIds, excIds)),
                    );
                    return;
                }
                const { hand, exc } =
                    kind === 'none'
                        ? pickLeaves(leafIds, handIds, excIds, ruleIds)
                        : unpickLeaves(leafIds, handIds, excIds, ruleIds);
                onChangeHandpicked(Array.from(hand));
                onChangeExcluded(Array.from(exc));
                return;
            }
            const aggregate = aggregates.get(nodeId);
            const anyInScope = (aggregate?.scope ?? 0) > 0;
            const { hand, exc } = anyInScope
                ? unpickLeaves(leafIds, handIds, excIds, ruleIds)
                : pickLeaves(leafIds, handIds, excIds, ruleIds);
            onChangeHandpicked(Array.from(hand));
            onChangeExcluded(Array.from(exc));
        },
        [
            tree,
            aggregates,
            ruleIds,
            handIds,
            excIds,
            onChangeHandpicked,
            onChangeExcluded,
        ],
    );

    const handleResetOverrides = useCallback(() => {
        onChangeHandpicked([]);
        onChangeExcluded([]);
    }, [onChangeHandpicked, onChangeExcluded]);

    const handleClearFilter = useCallback(() => {
        setQuery('');
    }, []);

    const isFiltering = query.trim() !== '';
    const isNoResult = isFiltering && rows.length === 0;

    const getLoadingRowSx = (
        width: string,
        indent: number,
    ): SxProps<Theme> => ({
        height: '5px',
        borderRadius: 1,
        backgroundColor: 'grey.200',
        width,
        ml: `${indent}px`,
        mt: indent ? 1 : 0,
    });

    if (isTreeError) {
        return (
            <Box sx={styles.box}>
                <Box sx={styles.centeredMessage}>
                    <CloudOff sx={{ fontSize: 24, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {formatMessage(MESSAGES.scopeLoadErrorTitle)}
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                    >
                        {formatMessage(MESSAGES.scopeLoadErrorDescription)}
                    </Typography>
                    <Button
                        variant="text"
                        size="small"
                        onClick={() => refetchTree()}
                        sx={{ mt: 1 }}
                    >
                        {formatMessage(MESSAGES.retry)}
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={styles.headerRow}>
                <Typography variant="subtitle1">
                    {formatMessage(MESSAGES.orgUnitsSectionLabel)}
                </Typography>
                <Box sx={styles.scopeLine}>
                    {formatMessage(MESSAGES.scopeLine, {
                        rule: String(rootAggregate.rule),
                        hand: String(rootAggregate.hand),
                        exc: String(rootAggregate.exc),
                        scope: String(rootAggregate.scope),
                    })}
                </Box>
            </Box>

            {isRuleError && (
                <Box sx={styles.previewError}>
                    <ErrorOutline color="error" fontSize="small" />
                    <Box flex={1}>
                        <Typography variant="body2">
                            {formatMessage(MESSAGES.scopePreviewErrorTitle)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatMessage(
                                MESSAGES.scopePreviewErrorDescription,
                            )}
                        </Typography>
                    </Box>
                    <Button
                        variant="text"
                        size="small"
                        color="error"
                        onClick={retryRule}
                    >
                        {formatMessage(MESSAGES.retry)}
                    </Button>
                </Box>
            )}

            <Box sx={styles.box}>
                <Box sx={styles.searchRow}>
                    <SearchIcon
                        fontSize="small"
                        sx={{ color: 'text.secondary' }}
                    />
                    <Box
                        component="input"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={formatMessage(
                            MESSAGES.scopeSearchPlaceholder,
                        )}
                        sx={styles.searchInput}
                    />
                    {isFiltering && (
                        <Box sx={styles.resultLine}>
                            {formatMessage(MESSAGES.scopeRowsShown, {
                                count: String(rows.length),
                            })}
                        </Box>
                    )}
                </Box>

                <Box sx={styles.treeScroll}>
                    {isLoadingTree && (
                        <Box sx={styles.centeredMessage}>
                            <Box sx={getLoadingRowSx('70%', 0)} />
                            <Box sx={getLoadingRowSx('52%', 22)} />
                            <Box sx={getLoadingRowSx('58%', 22)} />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                sx={{ mt: 1 }}
                            >
                                {formatMessage(MESSAGES.scopeLoading)}
                            </Typography>
                        </Box>
                    )}

                    {!isLoadingTree && isNoResult && (
                        <Box sx={styles.centeredMessage}>
                            <Typography variant="body2" color="text.secondary">
                                {formatMessage(MESSAGES.scopeNoResultTitle, {
                                    query,
                                })}
                            </Typography>
                            <Button
                                variant="text"
                                size="small"
                                onClick={handleClearFilter}
                            >
                                {formatMessage(MESSAGES.scopeClearFilter)}
                            </Button>
                        </Box>
                    )}

                    {!isLoadingTree &&
                        !isNoResult &&
                        tree &&
                        rows.map(row => {
                            const node = tree.nodesById.get(row.id);
                            if (!node) return null;
                            const aggregate =
                                aggregates.get(row.id) ?? EMPTY_AGGREGATE;
                            return (
                                <ScopeTreeRow
                                    key={row.id}
                                    node={node}
                                    depth={row.depth}
                                    aggregate={aggregate}
                                    kind={
                                        node.isLeaf
                                            ? leafKind(
                                                  node.id,
                                                  ruleIds,
                                                  handIds,
                                                  excIds,
                                              )
                                            : undefined
                                    }
                                    isOpen={row.isOpen}
                                    onToggleOpen={() =>
                                        handleToggleOpen(node.id)
                                    }
                                    onClick={() =>
                                        handleRowClick(node.id, node.isLeaf)
                                    }
                                />
                            );
                        })}
                </Box>

                <Box sx={styles.footer}>
                    <Typography variant="caption" color="text.secondary">
                        {formatMessage(MESSAGES.scopeFooterInScope, {
                            count: String(rootAggregate.scope),
                        })}
                    </Typography>
                    <Button
                        variant="text"
                        size="small"
                        onClick={handleResetOverrides}
                    >
                        {formatMessage(MESSAGES.scopeResetOverrides)}
                    </Button>
                </Box>
            </Box>
            {isLoadingRule && !isLoadingTree && <LoadingSpinner size={16} />}
        </Box>
    );
};
