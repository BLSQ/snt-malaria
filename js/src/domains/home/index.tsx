import React, { FC, useMemo } from 'react';
import {
    AccountTree,
    Compare,
    Layers,
    Payments,
    Vaccines,
} from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { FormattedMessage } from 'react-intl';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { userHasOneOfPermissions } from 'Iaso/domains/users/utils';
import { SxStyles } from 'Iaso/types/general';
import { hasFeatureFlag, IMPACT } from 'Iaso/utils/featureFlags';
import { useCurrentUser } from 'Iaso/utils/usersUtils';
import { PageContainer } from '../../components/styledComponents';
import { SETTINGS_READ } from '../../constants/permissions';
import { baseUrls } from '../../constants/urls';
import { ContributorsFooter } from '../contributors/components/ContributorsFooter';
import { HomeCard } from './components/HomeCard';
import { MESSAGES } from './messages';
import { HomeCardConfig } from './types';

const HOME_CARDS: HomeCardConfig[] = [
    {
        id: 'dataLayers',
        Icon: Layers,
        title: MESSAGES.dataLayersTitle,
        caption: MESSAGES.dataLayersCaption,
        to: `/${baseUrls.dataLayers}`,
        permissions: [SETTINGS_READ],
    },
    {
        id: 'interventions',
        Icon: Vaccines,
        title: MESSAGES.interventionsTitle,
        caption: MESSAGES.interventionsCaption,
        to: `/${baseUrls.settings}?tab=interventions`,
        permissions: [SETTINGS_READ],
    },
    {
        id: 'costSettings',
        Icon: Payments,
        title: MESSAGES.costSettingsTitle,
        caption: MESSAGES.costSettingsCaption,
        // TODO: point to a dedicated cost settings page once it exists.
        to: `/${baseUrls.settings}`,
        permissions: [SETTINGS_READ],
    },
    {
        id: 'scenarios',
        Icon: AccountTree,
        title: MESSAGES.scenariosTitle,
        caption: MESSAGES.scenariosCaption,
        to: `/${baseUrls.scenarios}`,
        permissions: [],
    },
    {
        id: 'comparison',
        Icon: Compare,
        title: MESSAGES.comparisonTitle,
        caption: MESSAGES.comparisonCaption,
        to: `/${baseUrls.compareCustomize}`,
        permissions: [],
        featureFlag: IMPACT,
    },
];

const styles = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 11,
        pb: 1,
        gap: 4,
    },
    titleBlock: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        textAlign: 'center',
    },
    wordmark: {
        fontSize: 56,
        lineHeight: 1.1,
        fontWeight: 900,
        letterSpacing: '-0.02em',
        color: 'text.primary',
    },
    wordmarkAccent: {
        color: 'primary.main',
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 1.5,
        fontWeight: 500,
        color: 'text.primary',
    },
    cards: {
        width: '100%',
        maxWidth: 948,
        minHeight: 187,
        // Flex-wrap rather than grid so a lone card on the last row is centred.
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 3,
        '& > *': {
            flexBasis: {
                xs: '100%',
                md: 'calc(50% - 12px)',
            },
        },
    },
    spacer: {
        flexGrow: 1,
    },
} satisfies SxStyles;

export const Home: FC = () => {
    const { formatMessage } = useSafeIntl();
    const currentUser = useCurrentUser();
    const allowedCards = useMemo(
        () =>
            HOME_CARDS.filter(
                card =>
                    (card.permissions.length === 0 ||
                        userHasOneOfPermissions(
                            card.permissions,
                            currentUser,
                        )) &&
                    (!card.featureFlag ||
                        hasFeatureFlag(currentUser, card.featureFlag)),
            ),
        [currentUser],
    );

    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <PageContainer sx={styles.page}>
                <Box sx={styles.titleBlock}>
                    <Typography component="h1" sx={styles.wordmark}>
                        <FormattedMessage
                            {...MESSAGES.wordmark}
                            values={{
                                accent: chunks => (
                                    <Box
                                        component="span"
                                        sx={styles.wordmarkAccent}
                                    >
                                        {chunks}
                                    </Box>
                                ),
                            }}
                        />
                    </Typography>
                    <Typography sx={styles.subtitle}>
                        {formatMessage(MESSAGES.subtitle)}
                    </Typography>
                </Box>
                <Box
                    component="nav"
                    aria-label={formatMessage(MESSAGES.mainSections)}
                    sx={styles.cards}
                >
                    {allowedCards.map(card => (
                        <HomeCard key={card.id} card={card} />
                    ))}
                </Box>
                <Box sx={styles.spacer} />
                <ContributorsFooter />
            </PageContainer>
        </>
    );
};
