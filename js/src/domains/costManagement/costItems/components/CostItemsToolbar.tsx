import React, {
    Dispatch,
    FC,
    SetStateAction,
    useCallback,
    useMemo,
} from 'react';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { DropdownButton } from '../../../../components/DropdownButton';
import { InterventionCategory } from '../../../interventions/types';
import { MESSAGES } from '../../../messages';
import { CostItemFilters, CostItemGroup } from '../types';

type Props = {
    filters: CostItemFilters;
    onFiltersChange: Dispatch<SetStateAction<CostItemFilters>>;
    interventionCategories: InterventionCategory[];
    groups: CostItemGroup[];
    onAdd: (group: CostItemGroup) => void;
};

const styles = {
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        rowGap: 1,
        p: 2,
        pb: 1.5,
    },
    actions: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 1,
    },
    filter: { width: 240 },
} satisfies SxStyles;

export const CostItemsToolbar: FC<Props> = ({
    filters,
    onFiltersChange,
    interventionCategories,
    groups,
    onAdd,
}) => {
    const { formatMessage } = useSafeIntl();

    const categoryOptions = useMemo(
        () =>
            interventionCategories.map(category => ({
                label: category.name,
                value: category.id,
            })),
        [interventionCategories],
    );

    const handleSearchChange = useCallback(
        (_key: string, search: string) =>
            onFiltersChange(previous => ({ ...previous, search })),
        [onFiltersChange],
    );
    const handleCategoryChange = useCallback(
        (_key: string, interventionCategoryId?: number | null) =>
            onFiltersChange(previous => ({
                ...previous,
                interventionCategoryId: interventionCategoryId ?? null,
            })),
        [onFiltersChange],
    );
    const addOptions = useMemo(
        () =>
            groups.map(group => ({
                value: group.intervention.id,
                label: group.intervention.name,
                groupKey: String(group.interventionCategory.id),
                groupLabel: group.interventionCategory.name,
            })),
        [groups],
    );
    const handleAdd = useCallback(
        (interventionId: number) => {
            const group = groups.find(
                ({ intervention }) => intervention.id === interventionId,
            );
            if (group) {
                onAdd(group);
            }
        },
        [groups, onAdd],
    );

    return (
        <Box sx={styles.toolbar}>
            <Typography variant="h6">
                {formatMessage(MESSAGES.costItems)}
            </Typography>
            <Box sx={styles.actions}>
                <InputComponent
                    type="search"
                    keyValue="search"
                    value={filters.search}
                    onChange={handleSearchChange}
                    labelString={formatMessage(MESSAGES.searchCostItems)}
                    withMarginTop={false}
                    wrapperSx={styles.filter}
                />
                <InputComponent
                    type="select"
                    keyValue="interventionCategoryId"
                    value={filters.interventionCategoryId ?? undefined}
                    onChange={handleCategoryChange}
                    options={categoryOptions}
                    placeholder={formatMessage(
                        MESSAGES.allInterventionCategories,
                    )}
                    clearable
                    withMarginTop={false}
                    wrapperSx={styles.filter}
                />
                <DropdownButton
                    label={MESSAGES.addInterventionCostBreakdownLine}
                    options={addOptions}
                    onClick={handleAdd}
                    variant="contained"
                    groupOptions
                />
            </Box>
        </Box>
    );
};
