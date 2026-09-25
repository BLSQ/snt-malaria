import React, { FC, useCallback } from 'react';
import { Box, Link, Typography } from '@mui/material';
import { FilesUpload, useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { OpenHexaImportStatus } from '../../hooks/useGetOpenHexaImportStatus';
import { MESSAGES } from '../../messages';
import { WizardLayerType } from '../constants';
import { templateCsv } from '../gridCsv';
import { OpenHexaImportStatusMessage } from '../OpenHexaImportStatusMessage';
import { toOrgUnitRows } from '../orgUnitRows';

const styles = {
    question: { fontWeight: 600, mb: 1 },
    section: { mt: 2 },
    note: { display: 'block', mt: 1 },
} satisfies SxStyles;

type Props = {
    layerType: WizardLayerType;
    onUploadCsv: (file: File) => void;
    years: number[];
    orgUnits: OrgUnit[];
    openHexaStatus?: OpenHexaImportStatus;
};

export const StepDataControls: FC<Props> = ({
    layerType,
    onUploadCsv,
    years,
    orgUnits,
    openHexaStatus,
}) => {
    const { formatMessage } = useSafeIntl();

    const onDownloadTemplate = useCallback(() => {
        const csv = templateCsv(toOrgUnitRows(orgUnits), years);
        const url = URL.createObjectURL(
            new Blob([csv], { type: 'text/csv;charset=utf-8' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = 'metric_import_template.csv';
        link.click();
        URL.revokeObjectURL(url);
    }, [orgUnits, years]);

    if (layerType === 'openhexa') {
        return (
            <Box>
                <Typography variant="subtitle2" sx={styles.question}>
                    {formatMessage(MESSAGES.wizardStepData)}
                </Typography>
                <OpenHexaImportStatusMessage status={openHexaStatus} />
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={styles.note}
                >
                    {formatMessage(MESSAGES.wizardOpenHexaManualRefresh)}
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="subtitle2" sx={styles.question}>
                {formatMessage(MESSAGES.wizardStepData)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={styles.note}>
                {formatMessage(MESSAGES.wizardImportCsvHint)}
            </Typography>
            <Box sx={styles.section}>
                <FilesUpload
                    accept={{ 'text/csv': ['.csv'] }}
                    files={[]}
                    onFilesSelect={(files: File[]) => {
                        if (files[0]) onUploadCsv(files[0]);
                    }}
                    multi={false}
                    placeholder={formatMessage(MESSAGES.importCSV)}
                />
                <Link
                    component="button"
                    type="button"
                    onClick={onDownloadTemplate}
                    variant="caption"
                    sx={styles.note}
                >
                    {formatMessage(MESSAGES.downloadCSVTemplate)}
                </Link>
            </Box>
        </Box>
    );
};
