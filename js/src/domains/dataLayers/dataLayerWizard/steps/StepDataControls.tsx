import React, { FC, useCallback } from 'react';
import { Box, Link, Stack, Typography } from '@mui/material';
import { FilesUpload, useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { DataLayerYearOptions } from '../../../../constants/shared';
import { OpenHexaImportStatus } from '../../hooks/useGetOpenHexaImportStatus';
import { MESSAGES } from '../../messages';
import { StandardValueMethod, WizardLayerType } from '../constants';
import { templateCsv } from '../csvFromGrid';
import { OpenHexaImportStatusMessage } from '../OpenHexaImportStatusMessage';
import { toOrgUnitRows } from '../orgUnitRows';
import { SelectableCard } from '../SelectableCard';

const styles = {
    question: { fontWeight: 600, mb: 1 },
    methodTitle: { fontWeight: 600 },
    section: { mt: 2 },
    note: { display: 'block', mt: 1 },
} satisfies SxStyles;

type Props = {
    layerType: WizardLayerType;
    method: StandardValueMethod;
    onChangeMethod: (method: StandardValueMethod) => void;
    csvFile: File | null;
    onChangeCsvFile: (file: File | null) => void;
    year: number;
    onChangeYear: (year: number) => void;
    /** Data key of the layer being created — the template's value column. */
    code: string;
    orgUnits: OrgUnit[];
    /** OpenHexa's live import status — see `OpenHexaImportStatusMessage`. */
    openHexaStatus?: OpenHexaImportStatus;
};

const METHODS: {
    value: StandardValueMethod;
    title: typeof MESSAGES.wizardMethodUploadCsv;
    hint: typeof MESSAGES.wizardMethodUploadCsvHint;
}[] = [
    {
        value: 'csv',
        title: MESSAGES.wizardMethodUploadCsv,
        hint: MESSAGES.wizardMethodUploadCsvHint,
    },
    {
        value: 'manual',
        title: MESSAGES.wizardMethodManual,
        hint: MESSAGES.wizardMethodManualHint,
    },
];

export const StepDataControls: FC<Props> = ({
    layerType,
    method,
    onChangeMethod,
    csvFile,
    onChangeCsvFile,
    year,
    onChangeYear,
    code,
    orgUnits,
    openHexaStatus,
}) => {
    const { formatMessage } = useSafeIntl();

    // The generic template endpoint only lists layers that already exist, so the
    // wizard builds one that has this layer's key as its value column.
    const onDownloadTemplate = useCallback(() => {
        const csv = templateCsv(toOrgUnitRows(orgUnits), code || 'value');
        const url = URL.createObjectURL(
            new Blob([csv], { type: 'text/csv;charset=utf-8' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `${code || 'metric'}_import_template.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [orgUnits, code]);

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
                {formatMessage(MESSAGES.wizardDataQuestion)}
            </Typography>
            <Stack spacing={1}>
                {METHODS.map(option => (
                    <SelectableCard
                        key={option.value}
                        selected={option.value === method}
                        onSelect={() => onChangeMethod(option.value)}
                    >
                        <Typography variant="body2" sx={styles.methodTitle}>
                            {formatMessage(option.title)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatMessage(option.hint)}
                        </Typography>
                    </SelectableCard>
                ))}
            </Stack>

            <Box sx={styles.section}>
                <InputComponent
                    type="select"
                    keyValue="csvYear"
                    clearable={false}
                    options={DataLayerYearOptions}
                    value={year}
                    label={MESSAGES.selectYear}
                    onChange={(_key, value) => onChangeYear(value)}
                />
            </Box>

            {method === 'csv' && (
                <Box sx={styles.section}>
                    <FilesUpload
                        accept={{ 'text/csv': ['.csv'] }}
                        files={csvFile ? [csvFile] : []}
                        onFilesSelect={(files: File[]) =>
                            onChangeCsvFile(files[0] ?? null)
                        }
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
            )}
        </Box>
    );
};
