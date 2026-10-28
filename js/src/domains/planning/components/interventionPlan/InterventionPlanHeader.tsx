import React, { FC, ReactNode, Ref, useCallback } from 'react';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import CompareOutlinedIcon from '@mui/icons-material/CompareOutlined';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import {
    Box,
    Divider,
    MenuItem,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import { Link as MuiLink } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useNavigate } from 'react-router';
import { DeleteModal } from 'Iaso/components/DeleteRestoreModals/DeleteModal';
import ConfirmDialog from 'Iaso/components/dialogs/ConfirmDialogComponent';

import { DisplayIfUserHasPerm } from 'Iaso/components/DisplayIfUserHasPerm';

import { SxStyles } from 'Iaso/types/general';
import { noOp } from 'Iaso/utils';
import { MoreActions } from '../../../../components/MoreActions';
import { OrgUnitSelect } from '../../../../components/OrgUnitSelect';
import { ToggleButtonLabel } from '../../../../components/ToggleButtonLabel';
import { exportScenarioAPIPath } from '../../../../constants/api-urls';
import * as Permission from '../../../../constants/permissions';
import { baseUrls } from '../../../../constants/urls';
import { MESSAGES } from '../../../messages';
import {
    DuplicateScenarioModal,
    UpdateScenarioModal,
} from '../../../scenarios/components/ScenarioModal';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { PlanningTab } from '../../types/planningTab';

const styles = {
    root: {
        flexWrap: 'wrap',
        rowGap: 1,
    },
    tabDivider: {
        height: 24,
        alignSelf: 'center',
    },
} satisfies SxStyles;

type Props = {
    selectedOrgUnitId?: number;
    onOrgUnitChange: (orgUnitId?: number) => void;
    onDeleteScenario: () => void;
    onToggleLockScenario: () => void;
    lockScenarioRef?: Ref<HTMLDivElement>;
    moreActionsRef?: Ref<HTMLDivElement>;
    // Controls belonging to the active tab, rendered next to the tab switcher.
    tabActions?: ReactNode;
};

export const InterventionPlanHeader: FC<Props> = ({
    selectedOrgUnitId,
    onOrgUnitChange,
    onDeleteScenario,
    onToggleLockScenario,
    lockScenarioRef,
    moreActionsRef,
    tabActions,
}) => {
    const {
        scenarioId,
        scenario,
        canEditScenario,
        isScenarioEditable,
        isEditing,
        activeTab,
        setActiveTab,
    } = usePlanningContext();
    const csvUrl = `${exportScenarioAPIPath}?id=${scenarioId}`;

    const { formatMessage } = useSafeIntl();

    const navigate = useNavigate();

    const handleTabChange = useCallback(
        (_: unknown, value: PlanningTab | null) => value && setActiveTab(value),
        [setActiveTab],
    );

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
            sx={styles.root}
        >
            <Stack direction="row" spacing={2} alignItems="center">
                <ToggleButtonGroup
                    value={activeTab}
                    size="small"
                    onChange={handleTabChange}
                    exclusive
                >
                    <ToggleButton value="map">
                        <ToggleButtonLabel
                            icon={MapOutlinedIcon}
                            label={formatMessage(MESSAGES.mapView)}
                        />
                    </ToggleButton>
                    <ToggleButton value="list">
                        <ToggleButtonLabel
                            icon={TableRowsOutlinedIcon}
                            label={formatMessage(MESSAGES.listView)}
                        />
                    </ToggleButton>
                    {isEditing && (
                        <ToggleButton value="overrides">
                            <ToggleButtonLabel
                                icon={TuneOutlinedIcon}
                                label={formatMessage(MESSAGES.overridesView)}
                            />
                        </ToggleButton>
                    )}
                    {!isEditing && (
                        <ToggleButton value="budget">
                            <ToggleButtonLabel
                                icon={PaymentsOutlinedIcon}
                                label={formatMessage(MESSAGES.budgetView)}
                            />
                        </ToggleButton>
                    )}
                    {!isEditing && (
                        <ToggleButton value="summary">
                            <ToggleButtonLabel
                                icon={BarChartOutlinedIcon}
                                label={formatMessage(MESSAGES.summaryView)}
                            />
                        </ToggleButton>
                    )}
                    {!isEditing && (
                        <ToggleButton value="comparison">
                            <ToggleButtonLabel
                                icon={CompareOutlinedIcon}
                                label={formatMessage(MESSAGES.comparisonView)}
                            />
                        </ToggleButton>
                    )}
                </ToggleButtonGroup>
                {tabActions && (
                    <>
                        <Divider
                            orientation="vertical"
                            sx={styles.tabDivider}
                        />
                        {tabActions}
                    </>
                )}
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
