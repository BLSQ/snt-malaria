import React, { useCallback } from 'react';
import { Drawer } from '@mui/material';
import { LoadingSpinner } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { DrawerHeader } from '../../../../components/DrawerHeader';
import { Intervention } from '../../../planning/types/interventions';
import { useGetInterventionCosts } from '../../hooks/useGetInterventionCosts';
import { InterventionCostLine } from '../../types/interventionCost';
import { InterventionCostForm } from './InterventionCostForm';

type Props = {
    onClose: () => void;
    open: boolean;
    intervention: Intervention | null;
    onConfirm: (
        intervention: Intervention,
        costs: InterventionCostLine[],
    ) => void;
};

const styles: SxStyles = {
    drawer: {
        '& .MuiDrawer-paper': {
            height: '100vh',
            width: '509px',
            boxSizing: 'border-box',
            padding: 0,
        },
    },
};

export const InterventionCostDrawer: React.FC<Props> = ({
    onClose,
    open,
    intervention,
    onConfirm,
}) => {
    const { data: cost_lines, isFetching: isFetchingCosts } =
        useGetInterventionCosts(intervention?.id);

    const handleFormConfirm = useCallback(
        costConfig => {
            onConfirm(
                {
                    ...intervention,
                    cost_per_unit: costConfig.cost_per_unit,
                    cost_unit: costConfig.cost_unit,
                } as Intervention,
                costConfig.cost_lines,
            );
        },
        [onConfirm, intervention],
    );

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                sx={styles.drawer}
            >
                <DrawerHeader
                    title={intervention?.name ?? ''}
                    onClose={onClose}
                />
                {isFetchingCosts ? (
                    <LoadingSpinner absolute={true} />
                ) : (
                    <InterventionCostForm
                        defaultValues={{
                            cost_unit: intervention?.cost_unit,
                            cost_per_unit:
                                intervention?.cost_per_unit ?? undefined,
                            cost_lines: cost_lines ?? [],
                        }}
                        onConfirm={handleFormConfirm}
                    />
                )}
            </Drawer>
        </>
    );
};
