import React from 'react';
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
                        unit: intervention?.unit,
                        cost_per_unit: intervention?.cost_per_unit ?? undefined,
                    }}
                    onConfirm={costConfig =>
                        onConfirm({
                            ...intervention,
                            ...costConfig,
                        } as Intervention)
                    }
                />
            </Drawer>
        </>
    );
};
