import React, { FunctionComponent, useCallback, useState } from 'react';
import { FC } from 'react';
import { Box, MenuItem, Typography } from '@mui/material';
import {
    ConfirmCancelModal,
    FilesUpload,
    makeFullModal,
    useSafeIntl,
} from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { noOp } from 'Iaso/utils';
import { useImportMetricValues } from './hooks/useImportMetricValues';
import { MESSAGES } from './messages';

const yearOptions = Array.from({ length: 20 }, (_, i) => {
    const year = 2020 + i;
    return { label: year.toString(), value: year };
});

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
};
const ImportMetricValuesModal: FC<Props> = ({ isOpen, closeDialog }) => {
    const { formatMessage } = useSafeIntl();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedYear, setSelectedYear] = useState(yearOptions[0].value);

    const { mutate: importMetricValues } = useImportMetricValues();

    const handleSubmit = useCallback(() => {
        if (selectedFile) {
            importMetricValues(
                { file: selectedFile, year: selectedYear },
                { onSuccess: closeDialog },
            );
        }
    }, [selectedFile, selectedYear, importMetricValues, closeDialog]);

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
            onClose={closeDialog || noOp}
            allowConfirm={selectedFile !== null}
            onCancel={closeDialog || noOp}
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
            <InputComponent
                type="select"
                keyValue="id"
                options={yearOptions}
                value={selectedYear}
                label={MESSAGES.selectYear}
                onChange={(_, value) => setSelectedYear(value)}
                wrapperSx={{ mt: 2 }}
            />
            <Typography variant="caption" color="textSecondary" sx={{ mt: 2 }}>
                {formatMessage(MESSAGES.importCSVYearCaption)}
            </Typography>
        </ConfirmCancelModal>
    );
};

export const ImportMetricValuesDialog = makeFullModal(
    ImportMetricValuesModal,
    ImportAction,
);
