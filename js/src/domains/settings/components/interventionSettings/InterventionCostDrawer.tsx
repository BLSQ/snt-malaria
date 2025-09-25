import React, { useCallback } from 'react';
import { Drawer } from '@mui/material';
import { LoadingSpinner } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { DrawerHeader } from '../../../../components/DrawerHeader';
import { Intervention } from '../../../planning/types/interventions';
import { useGetInterventionCostBreakdownLines } from '../../hooks/useGetInterventionCostBreakdownLines';
import { InterventionCostBreakdownLine } from '../../types/InterventionCostBreakdownLine';
import { InterventionCostForm } from './InterventionCostForm';

type Props = {
    onClose: () => void;
    open: boolean;
    intervention: Intervention | null;
    onConfirm: (
        intervention: Intervention,
        costs: InterventionCostBreakdownLine[],
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
    const { data: cost_breakdown_lines, isFetching: isFetchingCosts } =
        useGetInterventionCostBreakdownLines(intervention?.id);

    const handleFormConfirm = useCallback(
        costConfig => {
            onConfirm(
                {
                    ...intervention,
                    unit_cost: costConfig.unit_cost,
                    unit_type: costConfig.unit_type,
                } as Intervention,
                costConfig.cost_breakdown_lines,
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
                            unit_type: intervention?.unit_type,
                            unit_cost: intervention?.unit_cost ?? undefined,
                            cost_breakdown_lines: cost_breakdown_lines ?? [],
                        }}
                        onConfirm={handleFormConfirm}
                    />
                )}
            </Drawer>
        </>
    );
};
