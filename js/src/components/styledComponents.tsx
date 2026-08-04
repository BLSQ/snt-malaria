import {
    Paper,
    Box,
    AppBar as MuiAppBar,
    Card,
    ListSubheader,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Theme spacing steps of padding MUI's CardContent applies on every side (see CardStyled).
const CARD_CONTENT_PADDING = 2;

export const PaperFullHeight = styled(Paper)(({ theme }) => ({
    height: `calc(100vh - ${theme.spacing(12)})`,
    backgroundColor: theme.palette.background.default,
}));

export const PaperContainer = styled(Box)(() => ({
    overflow: 'auto',
}));

export const PageContainer = styled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(2),
    height: `calc(100vh - ${theme.spacing(8)})`,
    overflowY: 'auto',
}));

export const AppBar = styled(MuiAppBar)(({ theme }) => ({
    backgroundColor: 'transparent',
    color: theme.palette.primary.main,
    borderRadius: theme.spacing(2),
}));

export const ContentsContainer = styled(Box)(({ theme }) => ({
    maxWidth: '50%',
    margin: 'auto',
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    gap: theme.spacing(2),
}));

export const SidebarLayout = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    height: '100%',
    minHeight: 0,
    [theme.breakpoints.up('md')]: {
        flexDirection: 'row',
    },
}));

export const SidebarColumn = styled(Box)(({ theme }) => ({
    flex: 2,
    [theme.breakpoints.up('md')]: {
        minWidth: 450,
    },
}));

export const MainColumn = styled(Box)({
    flex: 7,
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
});

export const CardScrollable = styled(Card)(({}) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
}));

/**
 * Sticky category header for the card-hosted lists (data layers, node library). The negative `top`
 * matters: `top: 0` would pin below `CardContent`'s padding, leaving a strip at the top of the
 * scrollport where rows scrolling past show above the header.
 */
export const StickyListSubheader = styled(ListSubheader)(({ theme }) => ({
    position: 'sticky',
    top: theme.spacing(-CARD_CONTENT_PADDING),
    zIndex: 2,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    paddingLeft: 0,
    paddingRight: 0,
}));

// Wraps a settings form inside its card, adding top spacing so it doesn't sit
// flush against the card header. Page-level width capping/centering is done in
// the settings index, so the form just fills the available width here.
export const SettingsFormContainer = styled(Box)(({ theme }) => ({
    width: '100%',
    paddingTop: theme.spacing(3),
}));
