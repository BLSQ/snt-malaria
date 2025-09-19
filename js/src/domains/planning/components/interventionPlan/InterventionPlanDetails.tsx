import React, { FC, useCallback, useEffect, useMemo } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import {
    Box,
    Button,
    Divider,
    Drawer,
    InputAdornment,
    TextField,
    Typography,
} from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import DeleteDialog from 'Iaso/components/dialogs/DeleteDialogComponent';
import { SxStyles } from 'Iaso/types/general';
import { DrawerHeader } from '../../../../components/DrawerHeader';
import { MESSAGES } from '../../../messages';
import { InterventionPlan } from '../../types/interventions';

const styles: SxStyles = {
    drawer: {
        '& .MuiDrawer-paper': {
            height: '100vh',
            width: '509px',
            boxSizing: 'border-box',
            padding: 0,
        },
    },
    bodyWrapper: {
        padding: 4,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    body: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingX: 2,
        paddingY: 1,
    },
    list: { overflowY: 'auto', flexGrow: 1 },
    listItem: {
        paddingX: 2,
        paddingY: 1,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ' button': {
            opacity: 0,
        },
        ':hover button': {
            opacity: 1,
        },
    },
    textEmphasis: {
        fontWeight: 500,
        textTransform: 'lowercase',
    },
    searchWrapper: {
        marginBottom: 3,
    },
};

type Props = {
    interventionPlan: InterventionPlan | null;
    removeOrgUnitsFromPlan: (
        ordUnitIds: number[],
        shouldCloseModal: boolean,
    ) => void;
    closeInterventionPlanDetails: () => void;
    isRemovingOrgUnits: boolean;
};

export const InterventionPlanDetails: FC<Props> = ({
    interventionPlan,
    removeOrgUnitsFromPlan,
    closeInterventionPlanDetails,
    isRemovingOrgUnits = true,
}) => {
    const { formatMessage } = useSafeIntl();
    const [search, setSearch] = React.useState<string>('');
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const onSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();
        setSearch(event.target.value);
    };

    const onCloseInterventionPlanDetails = useCallback(() => {
        setSearch('');
        closeInterventionPlanDetails();
        setIsLoading(false);
        setIsOpen(false);
    }, [closeInterventionPlanDetails]);

    useEffect(() => {
        if (interventionPlan) setIsOpen(true);
        else if (!interventionPlan && isOpen) onCloseInterventionPlanDetails();
    }, [interventionPlan, onCloseInterventionPlanDetails, isOpen]);

    const onRemoveAllOrgUnitsFromPlan = useCallback(() => {
        if (!interventionPlan || interventionPlan.org_units.length === 0) {
            return;
        }

        removeOrgUnitsFromPlan(
            interventionPlan.org_units.map(o => o.intervention_assignment_id),
            true,
        );

        setIsLoading(true);
    }, [interventionPlan, removeOrgUnitsFromPlan]);

    const onRemoveOrgUnitFromPlan = useCallback(
        (interventionAssignmentId: number) => {
            removeOrgUnitsFromPlan(
                [interventionAssignmentId],
                interventionPlan?.org_units.length === 1,
            );
        },
        [removeOrgUnitsFromPlan, interventionPlan],
    );

    const filteredData = useMemo(() => {
        if (!interventionPlan) return [];
        return interventionPlan.org_units
            .filter(orgUnit =>
                orgUnit.name.toLowerCase().includes(search.toLowerCase()),
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [interventionPlan, search]);

    return (
        <Drawer
            anchor="right"
            open={isOpen}
            onClose={onCloseInterventionPlanDetails}
            sx={styles.drawer}
        >
            {isLoading && <LoadingSpinner />}
            <DrawerHeader
                title={interventionPlan?.intervention.name}
                onClose={onCloseInterventionPlanDetails}
            />
            <Box sx={styles.bodyWrapper}>
                <Box sx={styles.searchWrapper}>
                    <TextField
                        variant="outlined"
                        fullWidth
                        size="small"
                        placeholder={formatMessage(MESSAGES.searchPlaceholder)}
                        value={search}
                        onChange={onSearch}
                        disabled={isRemovingOrgUnits}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
                <Box sx={styles.body}>
                    <Typography variant="body2" sx={styles.textEmphasis}>
                        {interventionPlan?.org_units.length}{' '}
                        {formatMessage(MESSAGES.orgUnitDistrict)}
                    </Typography>
                    <DeleteDialog
                        onConfirm={onRemoveAllOrgUnitsFromPlan}
                        titleMessage={
                            MESSAGES.interventionAssignmentRemoveAllTitle
                        }
                        Trigger={Button}
                        triggerProps={{
                            variant: 'text',
                            size: 'small',
                            disabled: isRemovingOrgUnits,
                            children: formatMessage(
                                MESSAGES.interventionAssignmentRemoveAllButton,
                            ),
                            sx: { textTransform: 'none' },
                        }}
                        message={
                            MESSAGES.interventionAssignmentRemoveAllMessage
                        }
                    />
                </Box>
                <Box sx={styles.list}>
                    {filteredData.map(orgUnit => (
                        <Box sx={styles.listItem} key={orgUnit.id}>
                            <Typography key={orgUnit.id}>
                                {orgUnit.name}
                            </Typography>
                            <DeleteDialog
                                disabled={isRemovingOrgUnits}
                                onConfirm={() =>
                                    onRemoveOrgUnitFromPlan(
                                        orgUnit.intervention_assignment_id,
                                    )
                                }
                                titleMessage={
                                    MESSAGES.interventionAssignmentRemoveTitle
                                }
                                message={
                                    MESSAGES.interventionAssignmentRemoveMessage
                                }
                            />
                        </Box>
                    ))}
                </Box>
            </Box>
            <Divider />
        </Drawer>
    );
};
