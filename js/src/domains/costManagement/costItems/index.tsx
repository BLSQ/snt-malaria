import React, {
    FC,
    useCallback,
    useDeferredValue,
    useMemo,
    useState,
} from 'react';
import { Card, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { DeleteRestoreModal } from 'Iaso/components/DeleteRestoreModals/DeleteRestoreModal';
import { SxStyles } from 'Iaso/types/general';
import { useGetBudgetSettings } from '../../../hooks/useGetBudgetSettings';
import { useGetMetricTypes } from '../../dataLayers/hooks/useGetMetrics';
import { InterventionProvider } from '../../interventions/contexts/InterventionContext';
import { useGetInterventionCostBreakdownLineCategories } from '../../interventions/hooks/useGetInterventionCostBreakdownLineCategories';
import { useGetInterventionCostUnitTypes } from '../../interventions/hooks/useGetInterventionCostUnitType';
import {
    InterventionCostBreakdownLine,
    InterventionCostBreakdownLinePayload,
} from '../../interventions/types';
import { getDefaultCostUnitType } from '../../interventions/utils/costBreakdownLine';
import { MESSAGES } from '../../messages';
import { CostItemDialog } from './components/CostItemDialog';
import { CostItemsTable } from './components/CostItemsTable';
import { CostItemsToolbar } from './components/CostItemsToolbar';
import { useCostItemGroups } from './hooks/useCostItemGroups';
import { useSaveCostItems } from './hooks/useSaveCostItems';
import { CostItemFilters, CostItemGroup } from './types';
import { filterCostItemGroups } from './utils/costItemGroups';

const styles = {
    card: {
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
} satisfies SxStyles;

export const CostItemsManagement: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { groups, interventionCategories, isLoading } = useCostItemGroups();
    const { data: costCategoryOptions = [] } =
        useGetInterventionCostBreakdownLineCategories();
    const { data: costUnitTypeOptions = [] } =
        useGetInterventionCostUnitTypes();
    const { data: metricTypes = [] } = useGetMetricTypes(true);
    const { data: budgetSettings } = useGetBudgetSettings();
    const { updateLine, saveLine, deleteLine } = useSaveCostItems();

    const [filters, setFilters] = useState<CostItemFilters>({
        search: '',
        interventionCategoryId: null,
    });
    const [collapsedInterventionIds, setCollapsedInterventionIds] = useState<
        Set<number>
    >(new Set());
    const [editedLine, setEditedLine] =
        useState<InterventionCostBreakdownLinePayload | null>(null);
    const [deletedLine, setDeletedLine] =
        useState<InterventionCostBreakdownLine | null>(null);

    // Rows only pass their line up, since groups are rebuilt on every cache
    // write and would defeat the rows' memoization.
    const groupsByInterventionId = useMemo(
        () => new Map(groups.map(group => [group.intervention.id, group])),
        [groups],
    );
    const editedGroup =
        editedLine && groupsByInterventionId.get(editedLine.intervention);
    const deletedGroup =
        deletedLine && groupsByInterventionId.get(deletedLine.intervention);

    // Filtering re-renders the whole table, so it trails the typed search
    // instead of blocking each keystroke.
    const deferredFilters = useDeferredValue(filters);
    const visibleGroups = useMemo(
        () => filterCostItemGroups(groups, deferredFilters),
        [groups, deferredFilters],
    );

    const isSearching = deferredFilters.search.trim() !== '';
    const isGroupOpen = useCallback(
        (interventionId: number) =>
            isSearching || !collapsedInterventionIds.has(interventionId),
        [isSearching, collapsedInterventionIds],
    );
    const isAnyGroupOpen = visibleGroups.some(group =>
        isGroupOpen(group.intervention.id),
    );

    const handleToggleGroup = useCallback((interventionId: number) => {
        setCollapsedInterventionIds(previous => {
            const next = new Set(previous);
            if (next.has(interventionId)) {
                next.delete(interventionId);
            } else {
                next.add(interventionId);
            }
            return next;
        });
    }, []);

    const handleToggleAllGroups = useCallback(() => {
        setCollapsedInterventionIds(
            isAnyGroupOpen
                ? new Set(groups.map(group => group.intervention.id))
                : new Set(),
        );
    }, [isAnyGroupOpen, groups]);

    const handleAddLine = useCallback(
        (group: CostItemGroup) => {
            setEditedLine({
                name: '',
                category: costCategoryOptions[0]?.value ?? '',
                unit_type:
                    getDefaultCostUnitType(costUnitTypeOptions)?.value ?? '',
                unit_cost: 0,
                intervention: group.intervention.id,
                population_layer: null,
                is_proportional: true,
                conversion_factor: 1,
                invert_conversion_factor: false,
                coverage: 100,
                buffer: null,
            });
        },
        [costCategoryOptions, costUnitTypeOptions],
    );

    const handleConfirmDelete = useCallback(() => {
        if (deletedLine) {
            deleteLine(deletedLine.id);
        }
    }, [deletedLine, deleteLine]);

    const closeEditor = useCallback(() => setEditedLine(null), []);
    const closeDeleteDialog = useCallback(() => setDeletedLine(null), []);

    return (
        <InterventionProvider
            costCategoryOptions={costCategoryOptions}
            costUnitTypeOptions={costUnitTypeOptions}
            metricTypes={metricTypes}
            budgetSettings={budgetSettings}
        >
            <Card sx={styles.card}>
                {isLoading && <LoadingSpinner absolute />}
                <CostItemsToolbar
                    filters={filters}
                    onFiltersChange={setFilters}
                    interventionCategories={interventionCategories}
                    groups={groups}
                    onAdd={handleAddLine}
                />
                <CostItemsTable
                    groups={visibleGroups}
                    isGroupOpen={isGroupOpen}
                    isAnyGroupOpen={isAnyGroupOpen}
                    onToggleGroup={handleToggleGroup}
                    onToggleAllGroups={handleToggleAllGroups}
                    onUpdateLine={updateLine}
                    onAddLine={handleAddLine}
                    onEditLine={setEditedLine}
                    onDeleteLine={setDeletedLine}
                />
            </Card>
            {editedLine && editedGroup && (
                <CostItemDialog
                    key={editedLine.id ?? 'new'}
                    group={editedGroup}
                    initialLine={editedLine}
                    onSave={saveLine}
                    onClose={closeEditor}
                />
            )}
            <DeleteRestoreModal
                isOpen={Boolean(deletedLine)}
                closeDialog={closeDeleteDialog}
                onConfirm={handleConfirmDelete}
                titleMessage={MESSAGES.deleteCostItem}
                maxWidth="xs"
                id="delete-cost-item-dialog"
                dataTestId="delete-cost-item-dialog"
            >
                {deletedLine && deletedGroup && (
                    <Typography variant="body1">
                        {formatMessage(MESSAGES.deleteCostItemConfirm, {
                            name: deletedLine.name,
                            intervention: deletedGroup.intervention.name,
                        })}
                    </Typography>
                )}
            </DeleteRestoreModal>
        </InterventionProvider>
    );
};
