import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { CategoryOutlined } from '@mui/icons-material';
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
import { InterventionCategoryFormWrapper } from './components/InterventionCategoryFormWrapper';
import { InterventionCategoryList } from './components/InterventionCategoryList';

export const InterventionCategorySettings: FC = () => {
    const { formatMessage } = useSafeIntl();

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const { data: interventionCategories } = useGetInterventionCategories();

    // Selecting an existing category (or clearing the selection) always leaves creation mode.
    const selectInterventionCategory = useCallback((id: number | null) => {
        setIsCreating(false);
        setSelectedId(id);
    }, []);

    const handleAdd = useCallback(() => {
        setSelectedId(null);
        setIsCreating(true);
    }, []);

    // After a delete, fall back to the top of the remaining list (or nothing
    // when the last category was removed) rather than opening the "new
    // category" form.
    const handleDeleted = useCallback(() => {
        setIsCreating(false);
        setSelectedId(prev => {
            const remaining = (interventionCategories ?? []).filter(
                category => category.id !== prev,
            );
            return remaining.length > 0 ? remaining[0].id : null;
        });
    }, [interventionCategories]);

    // Cancelling creation falls back to the first category in the list, if any.
    const handleCancelCreate = useCallback(() => {
        setIsCreating(false);
        setSelectedId(
            interventionCategories && interventionCategories.length > 0
                ? interventionCategories[0].id
                : null,
        );
    }, [interventionCategories]);

    useEffect(() => {
        if (
            interventionCategories &&
            interventionCategories.length > 0 &&
            selectedId === null &&
            !isCreating
        ) {
            setSelectedId(interventionCategories[0].id);
        }
    }, [interventionCategories, selectedId, isCreating]);

    const selectedInterventionCategory = useMemo(
        () =>
            selectedId !== null
                ? (interventionCategories?.find(
                      category => category.id === selectedId,
                  ) ?? null)
                : null,
        [interventionCategories, selectedId],
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
                                <IconBoxed Icon={CategoryOutlined} />
                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    sx={{ flexGrow: 1, mb: 0 }}
                                >
                                    {formatMessage(
                                        MESSAGES.interventionCategoriesTitle,
                                    )}
                                </Typography>
                                <Button
                                    onClick={handleAdd}
                                    startIcon={<AddIcon />}
                                >
                                    {formatMessage(
                                        MESSAGES.addInterventionCategory,
                                    )}
                                </Button>
                            </Stack>
                        }
                    >
                        <InterventionCategoryList
                            interventionCategories={
                                interventionCategories || []
                            }
                            onSelectInterventionCategory={category =>
                                selectInterventionCategory(category.id)
                            }
                            activeInterventionCategoryId={selectedId}
                        />
                    </CardStyled>
                </CardScrollable>
            </SidebarColumn>
            <MainColumn>
                <CardScrollable>
                    {isFormOpen && (
                        <InterventionCategoryFormWrapper
                            key={isCreating ? 'new' : selectedId}
                            interventionCategory={selectedInterventionCategory}
                            onSaved={savedId => {
                                if (savedId != null) {
                                    selectInterventionCategory(savedId);
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
