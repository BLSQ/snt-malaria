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
import { useImportMetricValues } from '../../hooks/useImportMetricValues';
import { MESSAGES } from '../../messages';

type ImportActionProps = {
    onClick: () => void;
    beforeOnClick?: () => void;
};
const ImportAction: FunctionComponent<ImportActionProps> = ({
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
    onClose: () => void;
};
const ImportMetricValuesModal: FC<Props> = ({
    isOpen,
    closeDialog,
    onClose,
}) => {
    const { formatMessage } = useSafeIntl();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const handleSuccessClose = useCallback(() => {
        closeDialog();
        onClose();
    }, [closeDialog, onClose]);
    const { mutate: importMetricValues } = useImportMetricValues();

    const handleSubmit = useCallback(() => {
        if (selectedFile) {
            importMetricValues(selectedFile, { onSuccess: handleSuccessClose });
        }
    }, [selectedFile, importMetricValues, handleSuccessClose]);

    const handleOnChange = useCallback(
        (file: File[]) => setSelectedFile(file[0]),
        [setSelectedFile],
    );

    return (
        <ConfirmCancelModal
            dataTestId="import-metric-values-modal"
            id="import-metric-values-modal"
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
                    placeholder={formatMessage(MESSAGES.importCSV)}
                />
            </Box>
        </ConfirmCancelModal>
    );
};

export const ImportMetricValuesDialog = makeFullModal(
    ImportMetricValuesModal,
    ImportAction,
);
