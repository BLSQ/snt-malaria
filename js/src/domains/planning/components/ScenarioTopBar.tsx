import React, { FC } from 'react';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { Box, Typography, Theme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from 'Iaso/components/dialogs/ConfirmDialogComponent';
import DeleteDialog from 'Iaso/components/dialogs/DeleteDialogComponent';
import DownloadButtonsComponent from 'Iaso/components/DownloadButtonsComponent';
import { SxStyles } from 'Iaso/types/general';
import { noOp } from 'Iaso/utils';
import { exportScenarioAPIPath } from '../../../constants/api-urls';
import { baseUrls } from '../../../constants/urls';

import { MESSAGES } from '../../messages';
import {
    DuplicateScenarioModal,
    UpdateScenarioModal,
} from '../../scenarios/components/ScenarioModal';
import { useDeleteScenario } from '../../scenarios/hooks/useDeleteScenario';
import { Scenario } from '../../scenarios/types';
import { useUpdateScenario } from '../../scenarios/hooks/useUpdateScenario';

const styles: SxStyles = {
    content: (theme: Theme) => ({
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing(1),
    }),
    actionBtns: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
    },
};

type Props = {
    scenario: Scenario;
};

export const ScenarioTopBar: FC<Props> = ({ scenario }) => {
    const csvUrl = `${exportScenarioAPIPath}?id=${scenario.id}`;

    const navigate = useNavigate();
    const { formatMessage } = useSafeIntl();

    const { mutateAsync: deleteScenario } = useDeleteScenario(() => {
        navigate('/');
    });

    const { mutateAsync: updateScenario } = useUpdateScenario(scenario.id);

    const handleDeleteClick = () => {
        deleteScenario(scenario.id);
    };

    const handleToggleLockClick = () => {
        updateScenario({ ...scenario, is_locked: !scenario.is_locked });
    };

    const redirectToScenario = (scenarioId: number) => {
        if (scenarioId) {
            navigate(`/${baseUrls.planning}/scenarioId/${scenarioId}`);
        }
    };

    if (!scenario) {
        return null;
    }

    return (
        <Box sx={styles.content}>
            <Typography variant="h6">
                {scenario.name} {scenario.start_year} - {scenario.end_year}
            </Typography>
            <Box sx={styles.actionBtns}>
                <DownloadButtonsComponent variant="text" csvUrl={csvUrl} />
                <DuplicateScenarioModal
                    scenario={scenario}
                    onClose={redirectToScenario}
                    iconProps={{}}
                    titleMessage={formatMessage(MESSAGES.duplicate)}
                />
                <ConfirmDialog
                    BtnIcon={scenario.is_locked ? LockIcon : LockOpenIcon}
                    message={formatMessage(
                        scenario.is_locked
                            ? MESSAGES.modalUnlockScenarioConfirm
                            : MESSAGES.modalLockScenarioConfirm,
                    )}
                    question={formatMessage(
                        scenario.is_locked
                            ? MESSAGES.unlockScenario
                            : MESSAGES.lockScenario,
                    )}
                    confirm={handleToggleLockClick}
                    btnMessage={''}
                    tooltipMessage={
                        scenario.is_locked
                            ? formatMessage(MESSAGES.unlockScenario)
                            : formatMessage(MESSAGES.lockScenario)
                    }
                />
                {!scenario.is_locked && (
                    <>
                        <UpdateScenarioModal
                            onClose={noOp}
                            iconProps={{ color: 'primary' }}
                            scenario={scenario}
                        />
                        <DeleteDialog
                            onConfirm={handleDeleteClick}
                            titleMessage={MESSAGES.modalDeleteScenarioTitle}
                            iconColor={'primary'}
                            message={MESSAGES.modalDeleteScenarioConfirm}
                        />
                    </>
                )}
            </Box>
        </Box>
    );
};
