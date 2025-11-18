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
};
const ImportAction: FunctionComponent<PropsImportAction> = ({ onClick }) => {
    const { formatMessage } = useSafeIntl();
    return (
        <MenuItem onClick={onClick}>
            {formatMessage(MESSAGES.importCSV)}
        </MenuItem>
    );
};

type Props = {
    isOpen: boolean;
    closeDialog: () => void;
};
const ImportScenarioDialog: FC<Props> = ({ isOpen, closeDialog }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const { mutate: importScenario } = useImportScenario(closeDialog);
    const handleSubmit = () => {
        if (selectedFile) {
            importScenario(selectedFile);
        }
    };
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
            onClose={() => null}
            allowConfirm={selectedFile !== null}
            onCancel={noOp}
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
                    // errors={errors}
                    // disabled={disabled}
                    // placeholder={formatMessage(MESSAGES.document)}
                />
            </Box>
        </ConfirmCancelModal>
    );
};

export const ImportScenarioModal = makeFullModal(
    ImportScenarioDialog,
    ImportAction,
);
