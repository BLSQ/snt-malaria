import React, { FC, useMemo } from 'react';
import AccountTree from '@mui/icons-material/AccountTree';
import Compare from '@mui/icons-material/Compare';
import Layers from '@mui/icons-material/Layers';
import Payments from '@mui/icons-material/Payments';
import Vaccines from '@mui/icons-material/Vaccines';
import Box from '@mui/material/Box/Box';
import Typography from '@mui/material/Typography/Typography';
import { useSafeIntl } from 'bluesquare-components';
import { FormattedMessage } from 'react-intl';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { userHasOneOfPermissions } from 'Iaso/domains/users/utils';
import { SxStyles } from 'Iaso/types/general';
import { hasFeatureFlag, IMPACT } from 'Iaso/utils/featureFlags';
import { useCurrentUser } from 'Iaso/utils/usersUtils';
import logoMark from '../../../images/branding/snt-logo-mark.svg';
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
        to: `/${baseUrls.interventions}`,
        permissions: [SETTINGS_READ],
    },
    {
        id: 'costSettings',
        Icon: Payments,
        title: MESSAGES.costSettingsTitle,
        caption: MESSAGES.costSettingsCaption,
        to: `/${baseUrls.costManagement}`,
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

const CARD_MAX_WIDTH = 300;
const CARDS_GAP = 24;

// Four cards read better as a 2x2 grid than as 3 + 1.
const getColumnCount = (cardCount: number): number => (cardCount === 4 ? 2 : 3);

const getCardsMaxWidth = (columnCount: number): number =>
    columnCount * CARD_MAX_WIDTH + (columnCount - 1) * CARDS_GAP;

const styles = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 11,
        pb: 1,
        gap: 4,
        // Prevents children from shrinking and overlapping when the viewport is too short.
        '& > *': {
            flexShrink: 0,
        },
    },
    wrapper: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '100%',
        flexGrow: 1,
        gap: 4,
    },
    titleBlock: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        textAlign: 'center',
    },
    titleRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 2,
    },
    logoMark: {
        height: 80,
        width: 'auto',
        flexShrink: 0,
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
        minHeight: 187,
        // Flex-wrap rather than grid so a lone card on the last row is centred.
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: `${CARDS_GAP}px`,
        '& > *': {
            flex: '1 1 240px',
            maxWidth: CARD_MAX_WIDTH,
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
                <Box sx={styles.wrapper}>
                    <Box sx={styles.titleBlock}>
                        <Box sx={styles.titleRow}>
                            <Box
                                component="img"
                                src={`${window.STATIC_URL}${logoMark}`}
                                alt=""
                                sx={styles.logoMark}
                            />
                            <Typography component="h1" sx={styles.wordmark}>
                                <FormattedMessage
                                    {...MESSAGES.wordmark}
                                    values={{
                                        accountName:
                                            currentUser.account?.name ?? '',
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
                        </Box>
                        <Typography sx={styles.subtitle}>
                            {formatMessage(MESSAGES.subtitle)}
                        </Typography>
                    </Box>
                    <Box
                        component="nav"
                        aria-label={formatMessage(MESSAGES.mainSections)}
                        sx={{
                            ...styles.cards,
                            maxWidth: getCardsMaxWidth(
                                getColumnCount(allowedCards.length),
                            ),
                        }}
                    >
                        {allowedCards.map(card => (
                            <HomeCard key={card.id} card={card} />
                        ))}
                    </Box>
                </Box>
                <Box sx={styles.spacer} />
                <ContributorsFooter />
            </PageContainer>
        </>
    );
};
