import { IntlMessage } from 'bluesquare-components';
import bluesquareLogo from '../../images/partners/bluesquare.svg';
import chaiLogo from '../../images/partners/chai.png';
import gatesLogo from '../../images/partners/gates.png';
import idmLogo from '../../images/partners/idm.png';
import pathLogo from '../../images/partners/path.png';
import swisstphLogo from '../../images/partners/swisstph.png';
import whoLogo from '../../images/partners/who.png';
import { MESSAGES } from '../domains/contributors/messages';

export type PartnerName = string | IntlMessage;

export type Partner = {
    id: string;
    name: PartnerName;
    shortName?: PartnerName;
    url: string;
    // Missing logos render as a dashed placeholder tile.
    logo?: string;
    // Per-logo padding so logos with different aspect ratios look optically balanced in the tile.
    logoPadding?: string;
    logoTileWidth?: number;
};

export type DescribedPartner = Partner & {
    description: IntlMessage;
};

export type DevelopmentPartner = DescribedPartner & {
    people: string[];
};

export const leadDeveloper: DevelopmentPartner = {
    id: 'bluesquare',
    name: 'Bluesquare',
    url: 'https://bluesquarehub.com/',
    logo: bluesquareLogo,
    logoPadding: '16px',
    description: MESSAGES.bluesquareDescription,
    people: [
        'Benjamin Wilfart',
        'Michael Wendland',
        'Franck Hakizimana',
        'Moïse Abomabo',
        'Bram Jans',
        'Thibault Dethier',
        'Jérôme Cordiez',
        'Frederik Van den Broeck',
    ],
};

export const collaboratingDevelopers: DevelopmentPartner[] = [
    {
        id: 'chai',
        name: MESSAGES.chaiName,
        shortName: 'CHAI',
        url: 'https://www.clintonhealthaccess.org/',
        logo: chaiLogo,
        logoPadding: '6px 8px',
        description: MESSAGES.chaiDescription,
        people: ['Anthony Yuen'],
    },
    {
        id: 'idm',
        name: MESSAGES.idmName,
        shortName: 'IDM',
        url: 'https://www.idmod.org/',
        logo: idmLogo,
        logoPadding: '14px 18px',
        description: MESSAGES.idmDescription,
        people: ['David Kong', 'John Van der Heide'],
    },
    {
        id: 'path',
        name: 'PATH',
        url: 'https://www.path.org/',
        logo: pathLogo,
        logoPadding: '10px 14px',
        description: MESSAGES.pathDescription,
        people: ['Hayley Thompson', 'Justin Millar', 'Hannah Slater'],
    },
    {
        id: 'swisstph',
        name: 'Swiss TPH',
        url: 'https://www.swisstph.ch/en/',
        logo: swisstphLogo,
        logoPadding: '8px 14px',
        description: MESSAGES.swisstphDescription,
        people: [
            'Roland Goers',
            'Billy Bauzile',
            'Myroslava Volosko',
            'Emilie Pothin',
        ],
    },
];

export const developmentPartners: DevelopmentPartner[] = [
    leadDeveloper,
    ...collaboratingDevelopers,
];

export const technicalGuidancePartner: DescribedPartner = {
    id: 'who',
    name: MESSAGES.whoName,
    shortName: MESSAGES.whoShortName,
    url: 'https://www.who.int/home',
    logo: whoLogo,
    logoPadding: '6px',
    logoTileWidth: 72,
    description: MESSAGES.technicalGuidanceText,
};

export const fundingPartner: DescribedPartner = {
    id: 'gates',
    name: 'Gates Foundation',
    url: 'https://www.gatesfoundation.org/',
    logo: gatesLogo,
    logoPadding: '14px 12px',
    description: MESSAGES.fundingText,
};
