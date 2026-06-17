import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { AccountBalanceOutlined } from '@mui/icons-material';
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
import { GrantFormWrapper } from './components/GrantFormWrapper';
import { GrantList } from './components/GrantList';
import { useGetGrants } from './hooks/useGetGrants';

export const GrantSettings: FC = () => {
    const { formatMessage } = useSafeIntl();

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const { data: grants } = useGetGrants();

    // Selecting an existing grant (or clearing the selection) always leaves creation mode.
    const selectGrant = useCallback((id: number | null) => {
        setIsCreating(false);
        setSelectedId(id);
    }, []);

    const handleAdd = useCallback(() => {
        setSelectedId(null);
        setIsCreating(true);
    }, []);

    // After a delete, fall back to the top of the remaining list (or nothing
    // when the last grant was removed) rather than opening the "new grant" form.
    const handleDeleted = useCallback(() => {
        setIsCreating(false);
        setSelectedId(prev => {
            const remaining = (grants ?? []).filter(grant => grant.id !== prev);
            return remaining.length > 0 ? remaining[0].id : null;
        });
    }, [grants]);

    // Cancelling creation falls back to the first grant in the list, if any.
    const handleCancelCreate = useCallback(() => {
        setIsCreating(false);
        setSelectedId(grants && grants.length > 0 ? grants[0].id : null);
    }, [grants]);

    useEffect(() => {
        if (grants && grants.length > 0 && selectedId === null && !isCreating) {
            setSelectedId(grants[0].id);
        }
    }, [grants, selectedId, isCreating]);

    const selectedGrant = useMemo(
        () =>
            selectedId !== null
                ? (grants?.find(grant => grant.id === selectedId) ?? null)
                : null,
        [grants, selectedId],
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
                                <IconBoxed Icon={AccountBalanceOutlined} />
                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    sx={{ flexGrow: 1, mb: 0 }}
                                >
                                    {formatMessage(MESSAGES.grantsTitle)}
                                </Typography>
                                <Button
                                    onClick={handleAdd}
                                    startIcon={<AddIcon />}
                                >
                                    {formatMessage(MESSAGES.addGrant)}
                                </Button>
                            </Stack>
                        }
                    >
                        <GrantList
                            grants={grants || []}
                            onSelectGrant={grant => selectGrant(grant.id)}
                            activeGrantId={selectedId}
                        />
                    </CardStyled>
                </CardScrollable>
            </SidebarColumn>
            <MainColumn>
                <CardScrollable>
                    {isFormOpen && (
                        <GrantFormWrapper
                            key={isCreating ? 'new' : selectedId}
                            grant={selectedGrant}
                            onSaved={savedId => {
                                if (savedId != null) {
                                    selectGrant(savedId);
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
