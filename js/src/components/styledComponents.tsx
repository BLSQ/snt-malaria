import { Paper, Box, AppBar as MuiAppBar } from '@mui/material';
import { styled } from '@mui/material/styles';

export const PaperFullHeight = styled(Paper)(({ theme }) => ({
    height: `calc(100vh - ${theme.spacing(20)})`,
    backgroundColor: theme.palette.background.default,
}));

export const PaperContainer = styled(Box)(() => ({
    overflow: 'auto',
}));

export const PageContainer = styled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.background.default,
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
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
