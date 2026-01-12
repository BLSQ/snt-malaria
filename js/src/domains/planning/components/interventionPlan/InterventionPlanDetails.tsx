import React, { FC, useCallback, useEffect } from 'react';
import { Box, Drawer, Tab, Tabs } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { DrawerHeader } from '../../../../components/DrawerHeader';
import { MESSAGES } from '../../../messages';
import { BudgetAssumptions, InterventionPlan } from '../../types/interventions';
import { BudgetAssumptionsForm } from './BudgetAssumptionsForm';
import { InterventionOrgUnits } from './InterventionOrgUnits';

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
        height: '100%',
        justifyContent: 'space-between',
    },
};

type Props = {
    scenarioId: number;
    disabled?: boolean;
    interventionPlan?: InterventionPlan;
    budgetAssumptions?: BudgetAssumptions;
    closeInterventionPlanDetails: () => void;
    removeOrgUnitsFromPlan: (
        ordUnitIds: number[],
        shouldCloseModal: boolean,
    ) => void;
    isRemovingOrgUnits: boolean;
};

export const InterventionPlanDetails: FC<Props> = ({
    scenarioId,
    disabled = false,
    interventionPlan,
    budgetAssumptions,
    closeInterventionPlanDetails,
    removeOrgUnitsFromPlan,
    isRemovingOrgUnits = true,
}) => {
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [activeTab, setActiveTab] = React.useState<
        'budget_settings' | 'districts'
    >('budget_settings');

    const { formatMessage } = useSafeIntl();

    const onCloseInterventionPlanDetails = useCallback(() => {
        closeInterventionPlanDetails();
        setIsOpen(false);
    }, [closeInterventionPlanDetails]);

    useEffect(() => {
        if (interventionPlan) setIsOpen(true);
        else if (!interventionPlan && isOpen) onCloseInterventionPlanDetails();
    }, [interventionPlan, onCloseInterventionPlanDetails, isOpen]);

    return (
        <Drawer
            anchor="right"
            open={isOpen}
            onClose={onCloseInterventionPlanDetails}
            sx={styles.drawer}
        >
            {isLoading && <LoadingSpinner />}
            <DrawerHeader
                title={interventionPlan?.intervention.short_name}
                hideDivider={true}
                onClose={onCloseInterventionPlanDetails}
            />

            <Tabs
                value={activeTab}
                onChange={(event, newTab) => setActiveTab(newTab)}
            >
                <Tab
                    label={formatMessage(MESSAGES.budgetAssumptionsLabel)}
                    value="budget_settings"
                ></Tab>
                <Tab
                    label={formatMessage(MESSAGES.orgUnitDistrict)}
                    value="districts"
                ></Tab>
            </Tabs>
            <Box sx={styles.bodyWrapper}>
                {activeTab === 'budget_settings' &&
                    interventionPlan?.intervention &&
                    budgetAssumptions && (
                        <BudgetAssumptionsForm
                            scenarioId={scenarioId}
                            budgetAssumptions={budgetAssumptions}
                        />
                    )}
                {activeTab === 'districts' && interventionPlan && (
                    <InterventionOrgUnits
                        disabled={disabled}
                        setIsLoading={setIsLoading}
                        removeOrgUnitsFromPlan={removeOrgUnitsFromPlan}
                        isRemovingOrgUnits={isRemovingOrgUnits}
                        interventionPlan={interventionPlan}
                    />
                )}
            </Box>
        </Drawer>
    );
};
