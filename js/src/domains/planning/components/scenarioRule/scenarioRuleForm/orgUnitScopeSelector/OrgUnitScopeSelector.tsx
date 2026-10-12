import React, {
    FC,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { CloudOff, Search as SearchIcon } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { DelayedLoadingSpinner } from '../../../../../../components/DelayedLoadingSpinner';
import { MESSAGES } from '../../../../../messages';
import { MetricTypeCriterion } from '../../../../types/scenarioRule';
import { RuleMatchedOrgUnits } from '../useRuleMatchedOrgUnits';
import { ScopeTreeRow } from './ScopeTreeRow';
import {
    buildVisibleRows,
    computeAggregates,
    computeKeepForQuery,
    leafKind,
    pickLeaves,
    pruneNoOpOverrides,
    restoreLeaves,
    sumAggregates,
    unpickLeaves,
} from './scopeTreeUtils';
import { ScopeAggregate } from './types';
import { useOrgUnitScopeTree } from './useOrgUnitScopeTree';

const EMPTY_AGGREGATE: ScopeAggregate = {
    total: 0,
    rule: 0,
    hand: 0,
    exc: 0,
    scope: 0,
};

const styles = {
    box: {
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
    },
    searchRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        height: 40,
        px: 1.5,
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
        py: 0.5,
    },
    footer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        minHeight: 40,
        px: 1.5,
        borderTop: 1,
        borderColor: 'divider',
    },
    resetButton: {
        flex: '0 0 auto',
        whiteSpace: 'nowrap',
    },
    centeredMessage: {
        textAlign: 'center',
        p: 2,
    },
} satisfies SxStyles;

type Props = {
    interventionTypeId?: number;
    matchingCriteria: MetricTypeCriterion[];
    ruleMatches: RuleMatchedOrgUnits;
    excludedIds: number[];
    handpickedIds: number[];
    onChangeExcluded: (ids: number[]) => void;
    onChangeHandpicked: (ids: number[]) => void;
};

export const OrgUnitScopeSelector: FC<Props> = ({
    interventionTypeId,
    matchingCriteria,
    ruleMatches,
    excludedIds,
    handpickedIds,
    onChangeExcluded,
    onChangeHandpicked,
}) => {
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
        isAwaitingFirstResult,
    } = ruleMatches;
    const isLoadingRows = isLoadingTree || isAwaitingFirstResult;

    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [query, setQuery] = useState('');

    const ruleIds = useMemo(
        () => new Set(ruleMatchedIds ?? []),
        [ruleMatchedIds],
    );
    const handIds = useMemo(() => new Set(handpickedIds), [handpickedIds]);
    const excIds = useMemo(() => new Set(excludedIds), [excludedIds]);

    const previousRuleMatchedIds = useRef(ruleMatchedIds);
    useEffect(() => {
        const previous = previousRuleMatchedIds.current;
        previousRuleMatchedIds.current = ruleMatchedIds;
        if (
            previous === undefined ||
            ruleMatchedIds === undefined ||
            previous === ruleMatchedIds
        ) {
            return;
        }
        const { hand, exc } = pruneNoOpOverrides(
            ruleIds,
            handpickedIds,
            excludedIds,
        );
        if (hand.length !== handpickedIds.length) {
            onChangeHandpicked(hand);
        }
        if (exc.length !== excludedIds.length) {
            onChangeExcluded(exc);
        }
    }, [
        ruleMatchedIds,
        ruleIds,
        handpickedIds,
        excludedIds,
        onChangeHandpicked,
        onChangeExcluded,
    ]);

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

    const handleToggleSelection = useCallback(
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

    const hasCriteria = matchingCriteria.length > 0;
    const hasOverrides = rootAggregate.hand + rootAggregate.exc > 0;
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
                    {isLoadingRows && (
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

                    {!isLoadingRows && isNoResult && (
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

                    {!isLoadingRows &&
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
                                    hasCriteria={hasCriteria}
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
                                    onToggleSelection={() =>
                                        handleToggleSelection(
                                            node.id,
                                            node.isLeaf,
                                        )
                                    }
                                />
                            );
                        })}
                </Box>

                <Box sx={styles.footer}>
                    <Typography variant="caption" color="text.secondary">
                        {hasCriteria
                            ? formatMessage(MESSAGES.scopeFooterWithOverrides, {
                                  scope: String(rootAggregate.scope),
                                  hand: String(rootAggregate.hand),
                                  exc: String(rootAggregate.exc),
                              })
                            : formatMessage(MESSAGES.scopeFooterInScope, {
                                  count: String(rootAggregate.scope),
                              })}
                    </Typography>
                    {hasOverrides && (
                        <Button
                            variant="text"
                            size="small"
                            onClick={handleResetOverrides}
                            sx={styles.resetButton}
                        >
                            {formatMessage(
                                hasCriteria
                                    ? MESSAGES.scopeResetOverrides
                                    : MESSAGES.scopeClearSelection,
                            )}
                        </Button>
                    )}
                </Box>
            </Box>
            {isLoadingRule && !isLoadingRows && <DelayedLoadingSpinner />}
        </Box>
    );
};
