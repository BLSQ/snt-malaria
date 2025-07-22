import {
    Box,
    Button,
    Divider,
    Drawer,
    IconButton,
    Typography,
} from '@mui/material';
import React, { FC } from 'react';
import { InterventionPlan } from '../../types/interventions';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import { useSafeIntl } from 'bluesquare-components';
import { DeleteModal } from 'Iaso/components/DeleteRestoreModals/DeleteModal';

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
    },
    textEmphasis: {
        fontWeight: 500,
        textTransform: 'lowercase',
    },
};

type Props = {
    interventionPlan: InterventionPlan | null;
    removeAllOrgUnitsFromPlan: () => void;
    closeInterventionPlanDetails: () => void;
};

export const InterventionPlanDetails: FC<Props> = ({
    interventionPlan,
    removeAllOrgUnitsFromPlan,
    closeInterventionPlanDetails,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Drawer
            anchor="right"
            open={interventionPlan !== null}
            onClose={closeInterventionPlanDetails}
            sx={styles.drawer}
        >
            <Box sx={styles.header}>
                <IconButton
                    onClick={closeInterventionPlanDetails}
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
                <Box sx={styles.body}>
                    <Typography variant="body2" sx={styles.textEmphasis}>
                        {interventionPlan?.org_units.length}{' '}
                        {formatMessage(MESSAGES.orgUnitDistrict)}
                    </Typography>
                    <DeleteModal
                        type="button"
                        onConfirm={removeAllOrgUnitsFromPlan}
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
                    {interventionPlan?.org_units.map(orgUnit => (
                        <Box sx={styles.listItem} key={orgUnit.id}>
                            <Typography key={orgUnit.id}>
                                {orgUnit.name}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Box>
            <Divider />
        </Drawer>
    );
};
