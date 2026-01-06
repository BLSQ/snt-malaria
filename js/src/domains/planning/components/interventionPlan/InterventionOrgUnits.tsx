import React, { Dispatch, FC, useCallback, useMemo } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import {
    Box,
    Button,
    InputAdornment,
    TextField,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import DeleteDialog from 'Iaso/components/dialogs/DeleteDialogComponent';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { InterventionPlan } from '../../types/interventions';

const styles: SxStyles = {
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
    body: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingX: 2,
        paddingY: 1,
    },
};
type Props = {
    disabled?: boolean;
    interventionPlan: InterventionPlan;
    removeOrgUnitsFromPlan: (
        ordUnitIds: number[],
        shouldCloseModal: boolean,
    ) => void;
    setIsLoading: Dispatch<boolean>;
    isRemovingOrgUnits: boolean;
};

export const InterventionOrgUnits: FC<Props> = ({
    disabled = false,
    interventionPlan,
    removeOrgUnitsFromPlan,
    setIsLoading,
    isRemovingOrgUnits,
}) => {
    const [search, setSearch] = React.useState<string>('');

    const { formatMessage } = useSafeIntl();
    const onSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();
        setSearch(event.target.value);
    };

    const onRemoveAllOrgUnitsFromPlan = useCallback(() => {
        if (!interventionPlan || interventionPlan.org_units.length === 0) {
            return;
        }

        removeOrgUnitsFromPlan(
            interventionPlan.org_units.map(o => o.intervention_assignment_id),
            true,
        );

        setIsLoading(true);
    }, [interventionPlan, removeOrgUnitsFromPlan, setIsLoading]);

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
        <>
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
                {!disabled && (
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
                )}
            </Box>
            <Box sx={styles.list}>
                {filteredData.map(orgUnit => (
                    <Box sx={styles.listItem} key={orgUnit.id}>
                        <Typography key={orgUnit.id}>{orgUnit.name}</Typography>
                        {!disabled && (
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
                        )}
                    </Box>
                ))}
            </Box>
        </>
    );
};
