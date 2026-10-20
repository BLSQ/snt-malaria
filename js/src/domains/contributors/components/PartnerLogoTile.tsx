import React, { FC } from 'react';
import { Box, Link } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { Partner } from '../../../constants/contributors';
import { useFormatPartnerName } from '../hooks/useFormatPartnerName';
import { MESSAGES } from '../messages';

const DEFAULT_TILE_WIDTH = 152;

const styles = {
    tile: {
        height: 64,
        flexShrink: 0,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px',
        textDecoration: 'none',
        '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
        },
    },
    placeholder: {
        borderStyle: 'dashed',
        borderColor: 'rgba(0,0,0,0.23)',
        color: 'text.secondary',
        fontSize: 12,
        fontWeight: 500,
    },
    logo: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
    },
} satisfies SxStyles;

type Props = {
    partner: Partner;
};

export const PartnerLogoTile: FC<Props> = ({ partner }) => {
    const { formatMessage } = useSafeIntl();
    const formatPartnerName = useFormatPartnerName();
    const name = formatPartnerName(partner.name);
    const tileSx = {
        ...styles.tile,
        width: partner.logoTileWidth ?? DEFAULT_TILE_WIDTH,
        padding: partner.logoPadding,
    };

    return (
        <Link
            href={partner.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={partner.logo ? tileSx : { ...tileSx, ...styles.placeholder }}
        >
            {partner.logo ? (
                <Box
                    component="img"
                    src={`${window.STATIC_URL}${partner.logo}`}
                    alt={name}
                    sx={styles.logo}
                />
            ) : (
                `[${formatMessage(MESSAGES.logoPlaceholder, { name })}]`
            )}
        </Link>
    );
};
