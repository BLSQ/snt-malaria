import React, { FC } from 'react';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Divider, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { WarningBox } from '../../../components/WarningBox';
import { swisstphPartner } from '../../../constants/contributors';
import { useFormatPartnerName } from '../../contributors/hooks/useFormatPartnerName';
import { MESSAGES } from '../../messages';
import { ImpactProviderMeta } from '../types';
import { sectionStyles } from './ConfigurationPanel';

const EMULATOR_REPOSITORY_URL =
    'https://github.com/SwissTPH/om_dashboard_emulator_export';

const EMULATOR_DETAILS = [
    [MESSAGES.emulatorCoverageLabel, MESSAGES.emulatorCoverage],
    [MESSAGES.emulatorYearsLabel, MESSAGES.emulatorYears],
    [MESSAGES.emulatorUncertaintyLabel, MESSAGES.emulatorUncertainty],
];

const styles = {
    logo: {
        display: 'block',
        flexShrink: 0,
        height: 36,
        width: 'auto',
    },
    details: {
        m: 0,
        display: 'grid',
        gridTemplateColumns: '96px minmax(0, 1fr)',
        rowGap: 0.5,
        columnGap: 1.5,
        typography: 'caption',
    },
    detailLabel: {
        color: 'text.secondary',
    },
    detailValue: {
        m: 0,
    },
} satisfies SxStyles;

type InfoProps = {
    providerMeta: ImpactProviderMeta;
};

const FakeProviderInfo: FC<InfoProps> = () => {
    const { formatMessage } = useSafeIntl();
    return (
        <WarningBox
            severity="neutral"
            title={formatMessage(MESSAGES.fakeProviderInfoTitle)}
            description={formatMessage(MESSAGES.fakeProviderInfoBody)}
        />
    );
};

const EmulatorProviderInfo: FC<InfoProps> = ({ providerMeta }) => {
    const { formatMessage } = useSafeIntl();
    const developer = useFormatPartnerName()(swisstphPartner.name);
    const details = [
        [formatMessage(MESSAGES.emulatorDeveloperLabel), developer],
        ...EMULATOR_DETAILS.map(([label, value]) => [
            formatMessage(label),
            formatMessage(value),
        ]),
    ];

    return (
        <WarningBox
            severity="neutral"
            title={formatMessage(MESSAGES.emulatorName)}
            subtitle={
                providerMeta.version
                    ? formatMessage(MESSAGES.emulatorVersion, {
                          version: providerMeta.version,
                      })
                    : undefined
            }
            leading={
                <>
                    <Box
                        component="img"
                        src={`${window.STATIC_URL}${swisstphPartner.logo}`}
                        alt={developer}
                        sx={styles.logo}
                    />
                    <Divider orientation="vertical" flexItem />
                </>
            }
            description={formatMessage(MESSAGES.emulatorDescription)}
            action={
                <Button
                    component="a"
                    href={EMULATOR_REPOSITORY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="text"
                    color="primary"
                    size="small"
                    endIcon={<OpenInNewIcon />}
                >
                    {formatMessage(MESSAGES.emulatorViewOnGithub)}
                </Button>
            }
        >
            <Box component="dl" sx={styles.details}>
                {details.map(([label, value]) => (
                    <React.Fragment key={label}>
                        <Box component="dt" sx={styles.detailLabel}>
                            {label}
                        </Box>
                        <Box component="dd" sx={styles.detailValue}>
                            {value}
                        </Box>
                    </React.Fragment>
                ))}
            </Box>
        </WarningBox>
    );
};

const PROVIDER_INFO: Record<string, FC<InfoProps>> = {
    fake: FakeProviderInfo,
    swisstph_emulator: EmulatorProviderInfo,
};

type Props = {
    providerMeta?: ImpactProviderMeta;
};

export const ImpactProviderInfo: FC<Props> = ({ providerMeta }) => {
    const { formatMessage } = useSafeIntl();
    const ProviderInfo = providerMeta
        ? PROVIDER_INFO[providerMeta.provider_key]
        : undefined;
    if (!providerMeta || !ProviderInfo) return null;

    return (
        <Box sx={sectionStyles.section}>
            <Typography sx={sectionStyles.sectionTitle}>
                {formatMessage(MESSAGES.dataInformationTitle)}
            </Typography>
            <ProviderInfo providerMeta={providerMeta} />
        </Box>
    );
};
