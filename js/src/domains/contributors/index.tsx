import React, { FC, ReactNode } from 'react';
import { ArrowBack } from '@mui/icons-material';
import { Box, Link, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { Link as RouterLink } from 'react-router-dom';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { SxStyles } from 'Iaso/types/general';
import { PageContainer } from '../../components/styledComponents';
import {
    DescribedPartner,
    DevelopmentPartner,
    developmentPartners,
    fundingPartner,
    technicalGuidancePartner,
} from '../../constants/contributors';
import { baseUrls } from '../../constants/urls';
import { PartnerLogoTile } from './components/PartnerLogoTile';
import { MESSAGES } from './messages';

const CONTENT_WIDTH = 948;

const styles = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 5,
        pb: 6,
        gap: 3,
    },
    backLinkRow: {
        width: '100%',
        maxWidth: CONTENT_WIDTH,
        display: 'flex',
    },
    backLink: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minHeight: 44,
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '0.02857em',
        textTransform: 'uppercase',
    },
    backIcon: {
        fontSize: 18,
    },
    card: {
        width: '100%',
        maxWidth: CONTENT_WIDTH,
        boxSizing: 'border-box',
        p: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        backgroundColor: 'background.paper',
        borderRadius: '12px',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
    },
    headingGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
    },
    heading: {
        fontSize: 24,
        lineHeight: 1.334,
        fontWeight: 500,
    },
    sectionLabel: {
        fontSize: 12,
        lineHeight: 1.66,
        fontWeight: 500,
        letterSpacing: '0.08333em',
        textTransform: 'uppercase',
        color: 'text.secondary',
    },
    partnerList: {
        m: 0,
        p: 0,
        listStyle: 'none',
    },
    partnerRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        py: 2,
        '& + &': {
            borderTop: '1px solid',
            borderColor: 'divider',
        },
    },
    partnerText: {
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
    },
    description: {
        fontSize: 14,
        lineHeight: 1.5,
    },
    people: {
        fontSize: 13,
        lineHeight: 1.5,
        letterSpacing: '0.01em',
        color: 'text.secondary',
    },
    countryPartnersText: {
        fontSize: 14,
        lineHeight: 1.6,
    },
    bottomRow: {
        display: 'grid',
        gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'repeat(2, minmax(0, 1fr))',
        },
        gap: 4,
        pt: 3,
        borderTop: '1px solid',
        borderColor: 'divider',
    },
    logoWithText: {
        display: 'flex',
        alignItems: 'center',
        gap: 2,
    },
} satisfies SxStyles;

type SectionProps = {
    label: string;
    gap: number;
    children: ReactNode;
};

const Section: FC<SectionProps> = ({ label, gap, children }) => (
    <Box sx={[styles.section, { gap }]}>
        <Typography component="h2" sx={styles.sectionLabel}>
            {label}
        </Typography>
        {children}
    </Box>
);

type DevelopmentPartnerRowProps = {
    partner: DevelopmentPartner;
};

const DevelopmentPartnerRow: FC<DevelopmentPartnerRowProps> = ({ partner }) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Box component="li" sx={styles.partnerRow}>
            <PartnerLogoTile partner={partner} />
            <Box sx={styles.partnerText}>
                <Typography sx={styles.description}>
                    {formatMessage(partner.description)}
                </Typography>
                <Typography sx={styles.people}>
                    {partner.people.join(', ')}
                </Typography>
            </Box>
        </Box>
    );
};

type PartnerWithTextProps = {
    partner: DescribedPartner;
};

const PartnerWithText: FC<PartnerWithTextProps> = ({ partner }) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Box sx={styles.logoWithText}>
            <PartnerLogoTile partner={partner} />
            <Typography sx={styles.description}>
                {formatMessage(partner.description)}
            </Typography>
        </Box>
    );
};

export const Contributors: FC = () => {
    const { formatMessage } = useSafeIntl();
    const title = formatMessage(MESSAGES.title);

    return (
        <>
            <TopBar title={title} disableShadow />
            <PageContainer sx={styles.page}>
                <Box sx={styles.backLinkRow}>
                    <Link
                        component={RouterLink}
                        to={`/${baseUrls.home}`}
                        underline="none"
                        sx={styles.backLink}
                    >
                        <ArrowBack sx={styles.backIcon} />
                        {formatMessage(MESSAGES.backToHome)}
                    </Link>
                </Box>
                <Box
                    component="section"
                    aria-labelledby="contributors-title"
                    sx={styles.card}
                >
                    <Box sx={styles.headingGroup}>
                        <Typography
                            id="contributors-title"
                            component="h1"
                            sx={styles.heading}
                        >
                            {title}
                        </Typography>
                        <Typography variant="body1">
                            {formatMessage(MESSAGES.intro)}
                        </Typography>
                    </Box>
                    <Section
                        label={formatMessage(MESSAGES.developmentPartners)}
                        gap={0.5}
                    >
                        <Box component="ul" sx={styles.partnerList}>
                            {developmentPartners.map(partner => (
                                <DevelopmentPartnerRow
                                    key={partner.id}
                                    partner={partner}
                                />
                            ))}
                        </Box>
                    </Section>
                    <Section
                        label={formatMessage(MESSAGES.countryPartners)}
                        gap={1.5}
                    >
                        <Typography sx={styles.countryPartnersText}>
                            {formatMessage(MESSAGES.countryPartnersText)}
                        </Typography>
                    </Section>
                    <Box sx={styles.bottomRow}>
                        <Section
                            label={formatMessage(MESSAGES.technicalGuidance)}
                            gap={1.5}
                        >
                            <PartnerWithText
                                partner={technicalGuidancePartner}
                            />
                        </Section>
                        <Section
                            label={formatMessage(MESSAGES.funding)}
                            gap={1.5}
                        >
                            <PartnerWithText partner={fundingPartner} />
                        </Section>
                    </Box>
                </Box>
            </PageContainer>
        </>
    );
};
