import React, { FunctionComponent, useCallback, useState } from 'react';
import { FC } from 'react';
import { Box, MenuItem } from '@mui/material';
import {
    ConfirmCancelModal,
    FilesUpload,
    makeFullModal,
    useSafeIntl,
} from 'bluesquare-components';
import { noOp } from 'Iaso/utils';
import { MESSAGES } from '../../messages';
import { useImportScenario } from '../hooks/useImportScenario';

type PropsImportAction = {
    onClick: () => void;
    beforeOnClick?: () => void;
};
const ImportAction: FunctionComponent<PropsImportAction> = ({
    onClick,
    beforeOnClick,
}) => {
    const { formatMessage } = useSafeIntl();
    const handleClick = useCallback(() => {
        if (beforeOnClick) {
            beforeOnClick();
        }
        onClick();
    }, [beforeOnClick, onClick]);
    return (
        <MenuItem onClick={handleClick}>
            {formatMessage(MESSAGES.importCSV)}
        </MenuItem>
    );
};

type Props = {
    isOpen: boolean;
    closeDialog: () => void;
    onClose?: () => void;
};
const ImportScenarioDialog: FC<Props> = ({ isOpen, closeDialog, onClose }) => {
    const { formatMessage } = useSafeIntl();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const handleSuccessClose = useCallback(() => {
        closeDialog();
        if (onClose) {
            onClose();
        }
    }, [closeDialog, onClose]);
    const { mutate: importScenario } = useImportScenario(handleSuccessClose);

    const handleSubmit = useCallback(() => {
        if (selectedFile) {
            importScenario(selectedFile);
        }
    }, [selectedFile, importScenario]);

    const handleOnChange = useCallback(
        (file: File[]) => setSelectedFile(file[0]),
        [setSelectedFile],
    );

    return (
        <ConfirmCancelModal
            dataTestId="import-scenario-modal"
            id="import-scenario-modal"
            open={isOpen}
            closeDialog={closeDialog}
            onConfirm={handleSubmit}
            onClose={onClose || noOp}
            allowConfirm={selectedFile !== null}
            onCancel={onClose || noOp}
            cancelMessage={MESSAGES.cancel}
            confirmMessage={MESSAGES.importCSV}
            titleMessage={MESSAGES.importCSV}
            closeOnConfirm={false}
        >
            <Box sx={{ mt: 2 }}>
                <FilesUpload
                    accept={{ 'text/csv': ['.csv'] }}
                    files={selectedFile ? [selectedFile] : []}
                    onFilesSelect={handleOnChange}
                    multi={false}
                    placeholder={formatMessage(MESSAGES.scenarioCSV)}
                />
            </Box>
        </ConfirmCancelModal>
    );
};

export const ImportScenarioModal = makeFullModal(
    ImportScenarioDialog,
    ImportAction,
);
