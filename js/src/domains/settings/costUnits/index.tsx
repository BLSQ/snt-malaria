import React, { FC, useCallback, useEffect, useState } from 'react';
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
import { CostUnitType } from './types';

type Selection = number | 'new' | null;

export const CostUnitSettings: FC = () => {
    const { formatMessage } = useSafeIntl();

    const [selected, setSelected] = useState<Selection>(null);

    const { data: costUnitTypes } = useGetCostUnitTypes();

    useEffect(() => {
        if (costUnitTypes && costUnitTypes.length > 0 && selected === null) {
            setSelected(costUnitTypes[0].id);
        }
    }, [costUnitTypes, selected]);

    const handleSelectCostUnit = useCallback((costUnit: CostUnitType) => {
        setSelected(costUnit.id);
    }, []);

    const handleAdd = useCallback(() => {
        setSelected('new');
    }, []);

    const handleSaved = useCallback((savedId?: number) => {
        if (savedId) {
            setSelected(savedId);
        }
    }, []);

    const handleDeleted = useCallback(() => {
        setSelected(null);
    }, []);

    const selectedCostUnit =
        selected !== null && selected !== 'new'
            ? costUnitTypes?.find(unit => unit.id === selected) || null
            : null;

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
                            onSelectCostUnit={handleSelectCostUnit}
                            activeCostUnitId={
                                selected !== 'new' ? selected : null
                            }
                        />
                    </CardStyled>
                </CardScrollable>
            </SidebarColumn>
            <MainColumn>
                <CardScrollable>
                    {selected !== null && (
                        <CostUnitFormWrapper
                            key={selected}
                            costUnit={selectedCostUnit}
                            onSaved={handleSaved}
                            onDeleted={handleDeleted}
                        />
                    )}
                </CardScrollable>
            </MainColumn>
        </SidebarLayout>
    );
};
