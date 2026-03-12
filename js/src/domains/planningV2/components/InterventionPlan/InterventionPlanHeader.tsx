import React, { FC, useCallback } from 'react';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import {
    Button,
    MenuItem,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import { Link as MuiLink } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { useNavigate } from 'react-router';
import { DeleteModal } from 'Iaso/components/DeleteRestoreModals/DeleteModal';
import ConfirmDialog from 'Iaso/components/dialogs/ConfirmDialogComponent';

import { DisplayIfUserHasPerm } from 'Iaso/components/DisplayIfUserHasPerm';

import { noOp } from 'Iaso/utils';
import { MoreActions } from '../../../../components/MoreActions';
import { OrgUnitSelect } from '../../../../components/OrgUnitSelect';
import { exportScenarioAPIPath } from '../../../../constants/api-urls';
import * as Permission from '../../../../constants/permissions';
import { baseUrls } from '../../../../constants/urls';
import { MESSAGES } from '../../../messages';
import {
    DuplicateScenarioModal,
    UpdateScenarioModal,
} from '../../../scenarios/components/ScenarioModal';
import { useDeleteScenario } from '../../../scenarios/hooks/useDeleteScenario';
import { useUpdateScenario } from '../../../scenarios/hooks/useUpdateScenario';
import { usePlanningContext } from '../../contexts/PlanningContext';

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
    const { scenarioId, scenario, canEditScenario } = usePlanningContext();
    const csvUrl = `${exportScenarioAPIPath}?id=${scenarioId}`;

    const { formatMessage } = useSafeIntl();

    const navigate = useNavigate();

    const { mutateAsync: deleteScenario } = useDeleteScenario(() => {
        navigate('/');
    });

    const { mutateAsync: updateScenario } = useUpdateScenario(scenarioId);

    const handleDeleteClick = () => {
        deleteScenario(scenarioId);
    };

    const handleToggleLockClick = () => {
        updateScenario({ ...scenario, is_locked: !scenario?.is_locked });
    };

    const redirectToScenario = useCallback(
        (scenarioId: number | boolean) => {
            if (scenarioId) {
                navigate(`/${baseUrls.planning}/scenarioId/${scenarioId}`);
            }
        },
        [navigate],
    );

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
            <Stack direction="row" spacing={2} alignItems="center">
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
                <OrgUnitSelect
                    onOrgUnitChange={onOrgUnitChange}
                    selectedOrgUnitId={selectedOrgUnitId}
                />
                {canEditScenario && (
                    <ConfirmDialog
                        BtnIcon={scenario?.is_locked ? LockIcon : LockOpenIcon}
                        message={formatMessage(
                            scenario?.is_locked
                                ? MESSAGES.modalUnlockScenarioConfirm
                                : MESSAGES.modalLockScenarioConfirm,
                        )}
                        question={formatMessage(
                            scenario?.is_locked
                                ? MESSAGES.unlockScenario
                                : MESSAGES.lockScenario,
                        )}
                        confirm={handleToggleLockClick}
                        btnMessage={''}
                        tooltipMessage={
                            scenario?.is_locked
                                ? formatMessage(MESSAGES.unlockScenario)
                                : formatMessage(MESSAGES.lockScenario)
                        }
                    />
                )}
                <MoreActions>
                    <DisplayIfUserHasPerm
                        permissions={[
                            Permission.SCENARIO_BASIC_WRITE,
                            Permission.SCENARIO_FULL_WRITE,
                        ]}
                    >
                        <MenuItem component={MuiLink} href={csvUrl}>
                            {formatMessage(MESSAGES.downloadCSVTemplate)}
                        </MenuItem>
                        <DuplicateScenarioModal
                            scenario={scenario}
                            onClose={redirectToScenario}
                            iconProps={{}}
                            titleMessage={formatMessage(MESSAGES.duplicate)}
                        />
                    </DisplayIfUserHasPerm>

                    {canEditScenario && !scenario?.is_locked && (
                        <>
                            <UpdateScenarioModal
                                onClose={noOp}
                                iconProps={{ color: 'primary' }}
                                scenario={scenario}
                            />
                            <DeleteModal
                                onConfirm={handleDeleteClick}
                                titleMessage={MESSAGES.modalDeleteScenarioTitle}
                                type="menuItem"
                            >
                                {formatMessage(
                                    MESSAGES.modalDeleteScenarioConfirm,
                                )}
                            </DeleteModal>
                        </>
                    )}
                </MoreActions>
            </Stack>
        </Stack>
    );
};
