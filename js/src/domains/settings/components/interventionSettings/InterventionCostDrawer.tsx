import React, { useCallback } from 'react';
import { Drawer } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { DrawerHeader } from '../../../../components/DrawerHeader';
import { Intervention } from '../../../planning/types/interventions';
import { InterventionCostForm } from './InterventionCostForm';

type Props = {
    onClose: () => void;
    open: boolean;
    intervention: Intervention | null;
    onConfirm: (intervention: Intervention) => void;
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
    const handleFormConfirm = useCallback(
        costConfig => {
            onConfirm({
                ...intervention,
                ...costConfig,
            } as Intervention);
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
                <InterventionCostForm
                    defaultValues={{
                        cost_unit: intervention?.cost_unit,
                        cost_per_unit: intervention?.cost_per_unit ?? undefined,
                        costDetails: [
                            { name: 'test', category: 2, cost: 15.5, id: 1 },
                        ],
                    }}
                    onConfirm={handleFormConfirm}
                />
            </Drawer>
        </>
    );
};
