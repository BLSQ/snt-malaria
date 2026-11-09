import React, { FC, useCallback, useMemo, useState } from 'react';
import { CloudOff } from '@mui/icons-material';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../domains/messages';
import { useGetAccountSettings } from '../../domains/planning/hooks/useGetAccountSettings';
import { InlineSearchInput } from '../InlineSearchInput';
import { OrgUnitTreeRow } from './OrgUnitTreeRow';
import { buildVisibleRows, computeKeepForQuery } from './orgUnitTreeUtils';
import { TreeCheckState } from './types';
import { useOrgUnitTree } from './useOrgUnitTree';

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
    clearButton: {
        flex: '0 0 auto',
        whiteSpace: 'nowrap',
    },
    centeredMessage: {
        textAlign: 'center',
        p: 2,
    },
    errorIcon: {
        fontSize: 24,
        color: 'text.secondary',
    },
} satisfies SxStyles;

const countSelected = (leafIds: number[], selected: Set<number>): number =>
    leafIds.reduce((count, id) => (selected.has(id) ? count + 1 : count), 0);

const getCheckState = (
    selectedCount: number,
    total: number,
): TreeCheckState => {
    if (selectedCount === 0) return 'empty';
    return selectedCount === total ? 'checked' : 'partial';
};

type Props = {
    /** `undefined` means every org unit is selected. */
    selectedIds: number[] | undefined;
    onChange: (ids: number[] | undefined) => void;
};

export const OrgUnitTreeSelect: FC<Props> = ({ selectedIds, onChange }) => {
    const theme = useTheme();
    const { formatMessage } = useSafeIntl();
    const { data: accountSettings } = useGetAccountSettings();
    const { tree, isLoading, isError, refetch } = useOrgUnitTree(
        accountSettings?.intervention_org_unit_type_id,
    );

    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [query, setQuery] = useState('');

    const selected = useMemo(
        () => new Set(selectedIds ?? tree?.leafIds ?? []),
        [selectedIds, tree],
    );

    const handleChange = useCallback(
        (ids: number[]) =>
            onChange(ids.length === tree?.leafIds.length ? undefined : ids),
        [tree, onChange],
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
        (nodeId: number) => {
            if (!tree) return;
            const leafIds = tree.leafIdsByAncestor.get(nodeId) ?? [];
            const next = new Set(selected);
            if (countSelected(leafIds, selected) > 0) {
                leafIds.forEach(id => next.delete(id));
            } else {
                leafIds.forEach(id => next.add(id));
            }
            handleChange(Array.from(next));
        },
        [tree, selected, handleChange],
    );

    const handleSelectAll = useCallback(() => onChange(undefined), [onChange]);
    const handleClearFilter = useCallback(() => setQuery(''), []);

    const isFiltering = query.trim() !== '';
    const isNoResult = isFiltering && rows.length === 0;
    const totalLeafCount = tree?.leafIds.length ?? 0;
    const selectedLeafCount = tree ? countSelected(tree.leafIds, selected) : 0;

    if (isError) {
        return (
            <Box sx={styles.box}>
                <Box sx={styles.centeredMessage}>
                    <CloudOff sx={styles.errorIcon} />
                    <Typography variant="body2">
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
                        onClick={() => refetch()}
                    >
                        {formatMessage(MESSAGES.retry)}
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={styles.box}>
            <Box sx={styles.searchRow}>
                <InlineSearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder={formatMessage(MESSAGES.scopeSearchPlaceholder)}
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
                {isLoading && (
                    <Box sx={styles.centeredMessage}>
                        <Typography variant="caption" color="text.secondary">
                            {formatMessage(MESSAGES.scopeLoading)}
                        </Typography>
                    </Box>
                )}

                {!isLoading && isNoResult && (
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

                {!isLoading &&
                    !isNoResult &&
                    tree &&
                    rows.map(row => {
                        const node = tree.nodesById.get(row.id);
                        if (!node) return null;
                        const leafIds =
                            tree.leafIdsByAncestor.get(node.id) ?? [];
                        const selectedCount = countSelected(leafIds, selected);
                        return (
                            <OrgUnitTreeRow
                                key={row.id}
                                node={node}
                                depth={row.depth}
                                isOpen={row.isOpen}
                                checkState={getCheckState(
                                    selectedCount,
                                    leafIds.length,
                                )}
                                tooltip={formatMessage(
                                    selectedCount > 0
                                        ? MESSAGES.orgUnitTreeDeselectTooltip
                                        : MESSAGES.orgUnitTreeSelectTooltip,
                                )}
                                boxColor={
                                    selectedCount > 0
                                        ? theme.palette.primary.main
                                        : undefined
                                }
                                branchMeta={
                                    !node.isLeaf && (
                                        <span>
                                            {selectedCount}/{leafIds.length}
                                        </span>
                                    )
                                }
                                onToggleOpen={() => handleToggleOpen(node.id)}
                                onToggleSelection={() =>
                                    handleToggleSelection(node.id)
                                }
                            />
                        );
                    })}
            </Box>

            <Box sx={styles.footer}>
                <Typography variant="caption" color="text.secondary">
                    {formatMessage(MESSAGES.orgUnitTreeSelectedCount, {
                        count: String(selectedLeafCount),
                        total: String(totalLeafCount),
                    })}
                </Typography>
                {selectedLeafCount < totalLeafCount && (
                    <Button
                        variant="text"
                        size="small"
                        onClick={handleSelectAll}
                        sx={styles.clearButton}
                    >
                        {formatMessage(MESSAGES.orgUnitTreeSelectAll)}
                    </Button>
                )}
            </Box>
        </Box>
    );
};
