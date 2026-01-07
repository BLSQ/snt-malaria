import React, { useCallback } from 'react';
import { Drawer } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { DrawerHeader } from '../../../../components/DrawerHeader';
import { Intervention } from '../../../planning/types/interventions';
import { InterventionCostBreakdownLine } from '../../types/InterventionCostBreakdownLine';
import { InterventionCostForm } from './InterventionCostForm';

type Props = {
    onClose: () => void;
    open: boolean;
    intervention: Intervention | null;
    costBreakdownLines: InterventionCostBreakdownLine[] | undefined;
    year: number;
    onConfirm: (costs: InterventionCostBreakdownLine[]) => void;
};

const styles: SxStyles = {
    drawer: {
        '& .MuiDrawer-paper': {
            height: '100vh',
            width: '650px',
            boxSizing: 'border-box',
            padding: 0,
        },
    },
};

export const InterventionCostDrawer: React.FC<Props> = ({
    onClose,
    open,
    intervention,
    costBreakdownLines,
    year,
    onConfirm,
}) => {
    const handleFormConfirm = useCallback(
        costConfig => onConfirm(costConfig.cost_breakdown_lines),
        [onConfirm],
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
                    title={intervention ? `${intervention.short_name}` : ''}
                    onClose={onClose}
                />
                <InterventionCostForm
                    year={year}
                    defaultValues={{
                        cost_breakdown_lines: costBreakdownLines ?? [],
                    }}
                    onConfirm={handleFormConfirm}
                />
            </Drawer>
        </>
    );
};
