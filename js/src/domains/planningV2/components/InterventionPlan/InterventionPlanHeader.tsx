import React, { FC } from 'react';
import { Button, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { OrgUnitSelect } from '../../../../components/OrgUnitSelect';
import { MESSAGES } from '../../../messages';

type Props = {
    activeTab: string;
    isCalculatingBudget: boolean;
    selectedOrgUnitId?: number;
    onTabChange: (value: string) => void;
    onOrgUnitChange: (orgUnitId?: number) => void;
    onRunBudget: () => void;
};

export const InterventionPlanHeader: FC<Props> = ({
    activeTab,
    isCalculatingBudget,
    selectedOrgUnitId,
    onTabChange,
    onRunBudget,
    onOrgUnitChange,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
        >
            <ToggleButtonGroup
                value={activeTab}
                size="small"
                onChange={(_, value) => onTabChange(value)}
                exclusive
            >
                <ToggleButton value="map" key="map">
                    {formatMessage(MESSAGES.mapView)}
                </ToggleButton>
                <ToggleButton value="list" key="list">
                    {formatMessage(MESSAGES.listView)}
                </ToggleButton>
                <ToggleButton value="budget" key="budget">
                    {formatMessage(MESSAGES.budgetView)}
                </ToggleButton>
            </ToggleButtonGroup>
            <OrgUnitSelect
                onOrgUnitChange={onOrgUnitChange}
                selectedOrgUnitId={selectedOrgUnitId}
            />
            {activeTab === 'budget' && (
                <Button
                    variant="contained"
                    color="primary"
                    onClick={onRunBudget}
                    disabled={isCalculatingBudget}
                >
                    {formatMessage(MESSAGES.runInterventionPlanBudget)}
                    {isCalculatingBudget && (
                        <LoadingSpinner
                            size={16}
                            absolute
                            fixed={false}
                            transparent
                        />
                    )}
                </Button>
            )}
        </Stack>
    );
};
