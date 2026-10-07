import React, {
    Dispatch,
    FC,
    MouseEvent,
    SetStateAction,
    useCallback,
    useMemo,
    useState,
} from 'react';
import {
    Box,
    Button,
    ListSubheader,
    Menu,
    MenuItem,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
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

const AddCostItemMenuItem: FC<{
    group: CostItemGroup;
    onSelect: (group: CostItemGroup) => void;
}> = ({ group, onSelect }) => {
    const handleClick = useCallback(() => onSelect(group), [onSelect, group]);
    return (
        <MenuItem onClick={handleClick}>
            {group.intervention.name}, {group.interventionCategory.name}
        </MenuItem>
    );
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
    addMenuHeader: {
        typography: 'caption',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        lineHeight: 2.5,
    },
} satisfies SxStyles;

export const CostItemsToolbar: FC<Props> = ({
    filters,
    onFiltersChange,
    interventionCategories,
    groups,
    onAdd,
}) => {
    const { formatMessage } = useSafeIntl();
    const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(
        null,
    );

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
    const openAddMenu = useCallback(
        (event: MouseEvent<HTMLElement>) =>
            setAddMenuAnchor(event.currentTarget),
        [],
    );
    const closeAddMenu = useCallback(() => setAddMenuAnchor(null), []);
    const handleAdd = useCallback(
        (group: CostItemGroup) => {
            setAddMenuAnchor(null);
            onAdd(group);
        },
        [onAdd],
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
                <Button
                    variant="contained"
                    onClick={openAddMenu}
                    disabled={groups.length === 0}
                >
                    {formatMessage(MESSAGES.addInterventionCostBreakdownLine)}
                </Button>
                <Menu
                    anchorEl={addMenuAnchor}
                    open={Boolean(addMenuAnchor)}
                    onClose={closeAddMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <ListSubheader sx={styles.addMenuHeader}>
                        {formatMessage(MESSAGES.addToIntervention)}
                    </ListSubheader>
                    {groups.map(group => (
                        <AddCostItemMenuItem
                            key={group.intervention.id}
                            group={group}
                            onSelect={handleAdd}
                        />
                    ))}
                </Menu>
            </Box>
        </Box>
    );
};
