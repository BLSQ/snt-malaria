import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { StraightenOutlined } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import { Button, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { CardStyled } from '../../../components/CardStyled';
import { IconBoxed } from '../../../components/IconBoxed';
import {
    CardScrollable,
    MainColumn,
    SidebarColumn,
    SidebarLayout,
} from '../../../components/styledComponents';
import { MESSAGES } from '../../messages';
import { CostUnitFormWrapper } from './components/CostUnitFormWrapper';
import { CostUnitList } from './components/CostUnitList';
import { useGetCostUnitTypes } from './hooks/useGetCostUnitTypes';

export const CostUnitSettings: FC = () => {
    const { formatMessage } = useSafeIntl();

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const { data: costUnitTypes } = useGetCostUnitTypes();

    // Selecting an existing unit (or clearing the selection) always leaves creation mode.
    const selectCostUnit = useCallback((id: number | null) => {
        setIsCreating(false);
        setSelectedId(id);
    }, []);

    const handleAdd = useCallback(() => {
        setSelectedId(null);
        setIsCreating(true);
    }, []);

    // After a delete, fall back to the top of the remaining list (or nothing
    // when the last unit was removed) rather than opening the "new unit" form.
    const handleDeleted = useCallback(() => {
        setIsCreating(false);
        setSelectedId(prev => {
            const remaining = (costUnitTypes ?? []).filter(
                unit => unit.id !== prev,
            );
            return remaining.length > 0 ? remaining[0].id : null;
        });
    }, [costUnitTypes]);

    // Cancelling creation falls back to the first unit in the list, if any.
    const handleCancelCreate = useCallback(() => {
        setIsCreating(false);
        setSelectedId(
            costUnitTypes && costUnitTypes.length > 0
                ? costUnitTypes[0].id
                : null,
        );
    }, [costUnitTypes]);

    useEffect(() => {
        if (
            costUnitTypes &&
            costUnitTypes.length > 0 &&
            selectedId === null &&
            !isCreating
        ) {
            setSelectedId(costUnitTypes[0].id);
        }
    }, [costUnitTypes, selectedId, isCreating]);

    const selectedCostUnit = useMemo(
        () =>
            selectedId !== null
                ? (costUnitTypes?.find(unit => unit.id === selectedId) ?? null)
                : null,
        [costUnitTypes, selectedId],
    );

    const isFormOpen = isCreating || selectedId !== null;

    return (
        <SidebarLayout>
            <SidebarColumn>
                <CardScrollable>
                    <CardStyled
                        header={
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                            >
                                <IconBoxed Icon={StraightenOutlined} />
                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    sx={{ flexGrow: 1, mb: 0 }}
                                >
                                    {formatMessage(MESSAGES.costUnitsTitle)}
                                </Typography>
                                <Button
                                    onClick={handleAdd}
                                    startIcon={<AddIcon />}
                                >
                                    {formatMessage(MESSAGES.addCostUnit)}
                                </Button>
                            </Stack>
                        }
                    >
                        <CostUnitList
                            costUnitTypes={costUnitTypes || []}
                            onSelectCostUnit={unit => selectCostUnit(unit.id)}
                            activeCostUnitId={selectedId}
                        />
                    </CardStyled>
                </CardScrollable>
            </SidebarColumn>
            <MainColumn>
                <CardScrollable>
                    {isFormOpen && (
                        <CostUnitFormWrapper
                            key={isCreating ? 'new' : selectedId}
                            costUnit={selectedCostUnit}
                            onSaved={savedId => {
                                if (savedId != null) {
                                    selectCostUnit(savedId);
                                }
                            }}
                            onDeleted={handleDeleted}
                            onCancel={handleCancelCreate}
                        />
                    )}
                </CardScrollable>
            </MainColumn>
        </SidebarLayout>
    );
};
