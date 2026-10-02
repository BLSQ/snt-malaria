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

type EditedCostItem = {
    group: CostItemGroup;
    line: InterventionCostBreakdownLinePayload;
};

type DeletedCostItem = {
    group: CostItemGroup;
    line: InterventionCostBreakdownLine;
};

const styles = {
    card: {
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
} satisfies SxStyles;

export const BudgetManagement: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { groups, interventionCategories, isLoading } = useCostItemGroups();
    const { data: costCategoryOptions = [] } =
        useGetInterventionCostBreakdownLineCategories();
    const { data: costUnitTypeOptions = [] } =
        useGetInterventionCostUnitTypes();
    const { data: metricTypes = [] } = useGetMetricTypes(true);
    const { data: budgetSettings } = useGetBudgetSettings();
    const { saveLine, deleteLine } = useSaveCostItems();

    const [filters, setFilters] = useState<CostItemFilters>({
        search: '',
        interventionCategoryId: null,
    });
    const [collapsedInterventionIds, setCollapsedInterventionIds] = useState<
        Set<number>
    >(new Set());
    const [editedItem, setEditedItem] = useState<EditedCostItem | null>(null);
    const [deletedItem, setDeletedItem] = useState<DeletedCostItem | null>(
        null,
    );

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
            setEditedItem({
                group,
                line: {
                    name: '',
                    category: costCategoryOptions[0]?.value ?? '',
                    unit_type:
                        getDefaultCostUnitType(costUnitTypeOptions)?.value ??
                        '',
                    unit_cost: 0,
                    intervention: group.intervention.id,
                    population_layer: null,
                    is_proportional: true,
                    conversion_factor: 1,
                    invert_conversion_factor: false,
                    coverage: 100,
                },
            });
        },
        [costCategoryOptions, costUnitTypeOptions],
    );

    const handleEditLine = useCallback(
        (group: CostItemGroup, line: InterventionCostBreakdownLine) =>
            setEditedItem({ group, line }),
        [],
    );

    const handleRequestDelete = useCallback(
        (group: CostItemGroup, line: InterventionCostBreakdownLine) =>
            setDeletedItem({ group, line }),
        [],
    );

    const handleSaveEditedLine = useCallback(
        (line: InterventionCostBreakdownLinePayload) =>
            editedItem ? saveLine(editedItem.group, line) : Promise.resolve(),
        [editedItem, saveLine],
    );

    const handleConfirmDelete = useCallback(() => {
        if (deletedItem) {
            deleteLine(deletedItem.group, deletedItem.line.id);
        }
    }, [deletedItem, deleteLine]);

    const closeEditor = useCallback(() => setEditedItem(null), []);
    const closeDeleteDialog = useCallback(() => setDeletedItem(null), []);

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
                    onSaveLine={saveLine}
                    onAddLine={handleAddLine}
                    onEditLine={handleEditLine}
                    onDeleteLine={handleRequestDelete}
                />
            </Card>
            {editedItem && (
                <CostItemDialog
                    key={editedItem.line.id ?? 'new'}
                    group={editedItem.group}
                    initialLine={editedItem.line}
                    onSave={handleSaveEditedLine}
                    onClose={closeEditor}
                />
            )}
            <DeleteRestoreModal
                isOpen={Boolean(deletedItem)}
                closeDialog={closeDeleteDialog}
                onConfirm={handleConfirmDelete}
                titleMessage={MESSAGES.deleteCostItem}
                maxWidth="xs"
                id="delete-cost-item-dialog"
                dataTestId="delete-cost-item-dialog"
            >
                {deletedItem && (
                    <Typography variant="body1">
                        {formatMessage(MESSAGES.deleteCostItemConfirm, {
                            name: deletedItem.line.name,
                            intervention: deletedItem.group.intervention.name,
                        })}
                    </Typography>
                )}
            </DeleteRestoreModal>
        </InterventionProvider>
    );
};
