import React, { FC, useCallback, useMemo } from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import {
    Box,
    Divider,
    Drawer,
    IconButton,
    InputAdornment,
    TextField,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { DeleteModal } from 'Iaso/components/DeleteRestoreModals/DeleteModal';
import { SxStyles } from 'Iaso/types/general';
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
    header: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 2,
    },
    headerIcon: {
        marginRight: 2,
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
    removeOrgUnitsFromPlan: (ordUnitIds: number[]) => void;
    closeInterventionPlanDetails: () => void;
};

export const InterventionPlanDetails: FC<Props> = ({
    interventionPlan,
    removeOrgUnitsFromPlan,
    closeInterventionPlanDetails,
}) => {
    const { formatMessage } = useSafeIntl();
    const [search, setSearch] = React.useState<string>('');
    const onSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();
        setSearch(event.target.value);
    };

    const onCloseInterventionPlanDetails = useCallback(() => {
        setSearch('');
        closeInterventionPlanDetails();
    }, [closeInterventionPlanDetails]);

    const onRemoveAllOrgUnitsFromPlan = useCallback(
        () =>
            removeOrgUnitsFromPlan(
                interventionPlan?.org_units.map(
                    o => o.intervention_assignment_id,
                ) ?? [],
            ),
        [interventionPlan, removeOrgUnitsFromPlan],
    );

    const onRemoveOrgUnitFromPlan = useCallback(
        (interventionAssignmentId: number) => {
            removeOrgUnitsFromPlan([interventionAssignmentId]);
        },
        [removeOrgUnitsFromPlan],
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
            open={interventionPlan !== null}
            onClose={onCloseInterventionPlanDetails}
            sx={styles.drawer}
        >
            <Box sx={styles.header}>
                <IconButton
                    onClick={onCloseInterventionPlanDetails}
                    sx={styles.headerIcon}
                >
                    <ChevronRightIcon color="disabled" />
                </IconButton>
                {interventionPlan && (
                    <Typography>
                        {interventionPlan.intervention.name}
                    </Typography>
                )}
            </Box>
            <Divider />
            <Box sx={styles.bodyWrapper}>
                <Box sx={styles.searchWrapper}>
                    <TextField
                        variant="outlined"
                        fullWidth
                        size="small"
                        placeholder={formatMessage(MESSAGES.searchPlaceholder)}
                        value={search}
                        onChange={onSearch}
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
                    <DeleteModal
                        type="button"
                        onConfirm={onRemoveAllOrgUnitsFromPlan}
                        titleMessage={
                            MESSAGES.interventionAssignmentRemoveAllTitle
                        }
                        iconProps={{
                            variant: 'text',
                            size: 'small',
                            message: formatMessage(
                                MESSAGES.interventionAssignmentRemoveAllButton,
                            ),
                            sx: { textTransform: 'none' },
                        }}
                    >
                        <Typography>
                            {formatMessage(
                                MESSAGES.interventionAssignmentRemoveAllMessage,
                            )}
                        </Typography>
                    </DeleteModal>
                </Box>
                <Box sx={styles.list}>
                    {filteredData.map(orgUnit => (
                        <Box sx={styles.listItem} key={orgUnit.id}>
                            <Typography key={orgUnit.id}>
                                {orgUnit.name}
                            </Typography>
                            <DeleteModal
                                type="icon"
                                onConfirm={() =>
                                    onRemoveOrgUnitFromPlan(
                                        orgUnit.intervention_assignment_id,
                                    )
                                }
                                titleMessage={
                                    MESSAGES.interventionAssignmentRemoveTitle
                                }
                            >
                                <Typography>
                                    {formatMessage(
                                        MESSAGES.interventionAssignmentRemoveMessage,
                                    )}
                                </Typography>
                            </DeleteModal>
                        </Box>
                    ))}
                </Box>
            </Box>
            <Divider />
        </Drawer>
    );
};
