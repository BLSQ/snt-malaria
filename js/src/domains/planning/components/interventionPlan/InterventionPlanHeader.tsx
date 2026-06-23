import React, { FC, Ref, useCallback } from 'react';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import {
    Box,
    IconButton,
    MenuItem,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
} from '@mui/material';
import { Link as MuiLink } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
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
import { usePlanningContext } from '../../contexts/PlanningContext';

type Props = {
    activeTab: string;
    selectedOrgUnitId?: number;
    onTabChange: (value: string) => void;
    onOrgUnitChange: (orgUnitId?: number) => void;
    onDeleteScenario: () => void;
    onToggleLockScenario: () => void;
    lockScenarioRef?: Ref<HTMLDivElement>;
    moreActionsRef?: Ref<HTMLDivElement>;
};

export const InterventionPlanHeader: FC<Props> = ({
    activeTab,
    selectedOrgUnitId,
    onTabChange,
    onOrgUnitChange,
    onDeleteScenario,
    onToggleLockScenario,
    lockScenarioRef,
    moreActionsRef,
}) => {
    const {
        scenarioId,
        scenario,
        canEditScenario,
        isScenarioEditable,
        showRulesPanel,
        toggleShowRulesPanel,
    } = usePlanningContext();
    const csvUrl = `${exportScenarioAPIPath}?id=${scenarioId}`;

    const { formatMessage } = useSafeIntl();

    const navigate = useNavigate();

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
            <Stack direction="row" spacing={2}>
                <Tooltip
                    title={formatMessage(
                        showRulesPanel
                            ? MESSAGES.hideRulesPanel
                            : MESSAGES.showRulesPanel,
                    )}
                >
                    <IconButton size="small" onClick={toggleShowRulesPanel}>
                        <ViewSidebarIcon
                            color={showRulesPanel ? 'primary' : 'action'}
                        />
                    </IconButton>
                </Tooltip>
                <ToggleButtonGroup
                    value={activeTab}
                    size="small"
                    onChange={(_, value) => onTabChange(value)}
                    exclusive
                >
                    <ToggleButton value="map" key="map">
                        {formatMessage(MESSAGES.mapView)}
                    </ToggleButton>
                    <ToggleButton value="budget" key="budget">
                        {formatMessage(MESSAGES.budgetView)}
                    </ToggleButton>
                    <ToggleButton value="summary" key="summary">
                        {formatMessage(MESSAGES.summaryView)}
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
                <OrgUnitSelect
                    onOrgUnitChange={onOrgUnitChange}
                    selectedOrgUnitId={selectedOrgUnitId}
                />
                {canEditScenario && (
                    <Box ref={lockScenarioRef} display="inline-flex">
                        <ConfirmDialog
                            BtnIcon={
                                scenario?.is_locked ? LockIcon : LockOpenIcon
                            }
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
                            confirm={onToggleLockScenario}
                            btnMessage={''}
                            tooltipMessage={
                                scenario?.is_locked
                                    ? formatMessage(MESSAGES.unlockScenario)
                                    : formatMessage(MESSAGES.lockScenario)
                            }
                        />
                    </Box>
                )}
                <Box ref={moreActionsRef} sx={{ display: 'inline-flex' }}>
                    <MoreActions>
                        <DisplayIfUserHasPerm
                            permissions={[
                                Permission.SCENARIO_BASIC_WRITE,
                                Permission.SCENARIO_FULL_WRITE,
                            ]}
                        >
                            <MenuItem component={MuiLink} href={csvUrl}>
                                {formatMessage(MESSAGES.scenarioCSV)}
                            </MenuItem>
                            <DuplicateScenarioModal
                                scenario={scenario}
                                onClose={redirectToScenario}
                                iconProps={{}}
                                titleMessage={formatMessage(MESSAGES.duplicate)}
                            />
                        </DisplayIfUserHasPerm>

                        {isScenarioEditable && (
                            <>
                                <UpdateScenarioModal
                                    onClose={noOp}
                                    iconProps={{ color: 'primary' }}
                                    scenario={scenario}
                                />
                                <DeleteModal
                                    onConfirm={onDeleteScenario}
                                    titleMessage={
                                        MESSAGES.modalDeleteScenarioTitle
                                    }
                                    type="menuItem"
                                >
                                    {formatMessage(
                                        MESSAGES.modalDeleteScenarioConfirm,
                                    )}
                                </DeleteModal>
                            </>
                        )}
                    </MoreActions>
                </Box>
            </Stack>
        </Stack>
    );
};
