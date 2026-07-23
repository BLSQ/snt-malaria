import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { VaccinesOutlined } from '@mui/icons-material';
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
import { useGetInterventionCategories } from '../../interventions/hooks/useGetInterventionCategories';
import { MESSAGES } from '../../messages';
import { InterventionFormWrapper } from './components/InterventionFormWrapper';
import { InterventionList } from './components/InterventionList';

export const InterventionSettings: FC = () => {
    const { formatMessage } = useSafeIntl();

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const { data: interventionCategories } = useGetInterventionCategories();

    const flatInterventions = useMemo(
        () => (interventionCategories || []).flatMap(category => category.interventions),
        [interventionCategories],
    );

    // Selecting an existing intervention (or clearing the selection) always leaves creation mode.
    const selectIntervention = useCallback((id: number | null) => {
        setIsCreating(false);
        setSelectedId(id);
    }, []);

    const handleAdd = useCallback(() => {
        setSelectedId(null);
        setIsCreating(true);
    }, []);

    // After a delete, fall back to the top of the remaining list (or nothing
    // when the last intervention was removed) rather than opening the "new
    // intervention" form.
    const handleDeleted = useCallback(() => {
        setIsCreating(false);
        setSelectedId(prev => {
            const remaining = flatInterventions.filter(
                intervention => intervention.id !== prev,
            );
            return remaining.length > 0 ? remaining[0].id : null;
        });
    }, [flatInterventions]);

    // Cancelling creation falls back to the first intervention in the list, if any.
    const handleCancelCreate = useCallback(() => {
        setIsCreating(false);
        setSelectedId(
            flatInterventions.length > 0 ? flatInterventions[0].id : null,
        );
    }, [flatInterventions]);

    useEffect(() => {
        if (
            flatInterventions.length > 0 &&
            selectedId === null &&
            !isCreating
        ) {
            setSelectedId(flatInterventions[0].id);
        }
    }, [flatInterventions, selectedId, isCreating]);

    const selectedIntervention = useMemo(
        () =>
            selectedId !== null
                ? (flatInterventions.find(
                      intervention => intervention.id === selectedId,
                  ) ?? null)
                : null,
        [flatInterventions, selectedId],
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
                                <IconBoxed Icon={VaccinesOutlined}></IconBoxed>
                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    sx={{ flexGrow: 1, mb: 0 }}
                                >
                                    {formatMessage(MESSAGES.interventionsTitle)}
                                </Typography>
                                <Button
                                    onClick={handleAdd}
                                    startIcon={<AddIcon />}
                                >
                                    {formatMessage(MESSAGES.addIntervention)}
                                </Button>
                            </Stack>
                        }
                    >
                        <InterventionList
                            interventionCategories={
                                interventionCategories || []
                            }
                            onSelectIntervention={intervention =>
                                selectIntervention(intervention.id)
                            }
                            activeInterventionId={selectedId}
                        />
                    </CardStyled>
                </CardScrollable>
            </SidebarColumn>
            <MainColumn>
                <CardScrollable>
                    {isFormOpen && (
                        <InterventionFormWrapper
                            key={isCreating ? 'new' : selectedId}
                            intervention={selectedIntervention}
                            onSaved={savedId => {
                                if (savedId != null) {
                                    selectIntervention(savedId);
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
