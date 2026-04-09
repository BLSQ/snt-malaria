import { Paper, Box, AppBar as MuiAppBar, Card } from '@mui/material';
import { styled } from '@mui/material/styles';

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
});

export const CardScrollable = styled(Card)(({}) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
}));
