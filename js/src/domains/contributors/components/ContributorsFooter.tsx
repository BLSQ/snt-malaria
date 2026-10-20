import React, { FC } from 'react';
import { ArrowForward } from '@mui/icons-material';
import { Box, Link, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { FormattedList, FormattedMessage } from 'react-intl';
import { Link as RouterLink } from 'react-router-dom';
import { SxStyles } from 'Iaso/types/general';
import {
    Partner,
    collaboratingDevelopers,
    leadDeveloper,
    technicalGuidancePartner,
} from '../../../constants/contributors';
import { baseUrls } from '../../../constants/urls';
import { useFormatPartnerName } from '../hooks/useFormatPartnerName';
import { MESSAGES } from '../messages';

const styles = {
    footer: {
        width: '100%',
        maxWidth: 1120,
        minHeight: 56,
        mx: 'auto',
        boxSizing: 'border-box',
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        columnGap: 3,
        flexWrap: 'wrap',
        borderTop: '1px solid',
        borderColor: 'divider',
        color: 'text.secondary',
    },
    viewAllLink: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minHeight: 44,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
    },
    arrowIcon: {
        fontSize: 16,
    },
} satisfies SxStyles;

type PartnerLinkProps = {
    partner: Partner;
};

const PartnerLink: FC<PartnerLinkProps> = ({ partner }) => {
    const formatPartnerName = useFormatPartnerName();
    return (
        <Link href={partner.url} target="_blank" rel="noopener noreferrer">
            {formatPartnerName(partner.shortName ?? partner.name)}
        </Link>
    );
};

export const ContributorsFooter: FC = () => {
    const { formatMessage } = useSafeIntl();
    const formatPartnerName = useFormatPartnerName();

    return (
        <Box component="footer" sx={styles.footer}>
            <Typography variant="caption" component="p">
                <FormattedMessage
                    {...MESSAGES.footerSentence}
                    values={{
                        lead: formatPartnerName(leadDeveloper.name),
                        partners: (
                            <FormattedList
                                type="conjunction"
                                value={React.Children.toArray(
                                    collaboratingDevelopers.map(partner => (
                                        <PartnerLink partner={partner} />
                                    )),
                                )}
                            />
                        ),
                        guidance: (
                            <PartnerLink partner={technicalGuidancePartner} />
                        ),
                    }}
                />
            </Typography>
            <Link
                component={RouterLink}
                to={`/${baseUrls.contributors}`}
                underline="none"
                sx={styles.viewAllLink}
            >
                {formatMessage(MESSAGES.viewAllContributors)}
                <ArrowForward sx={styles.arrowIcon} />
            </Link>
        </Box>
    );
};
