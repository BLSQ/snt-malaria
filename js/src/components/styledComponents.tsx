import { Paper, Box, AppBar as MuiAppBar } from '@mui/material';
import { styled } from '@mui/material/styles';

export const PaperFullHeight = styled(Paper)(({ theme }) => ({
    height: `calc(100vh - ${theme.spacing(12)})`,
}));

export const PaperContainer = styled(Box)(({ theme }) => ({
    height: `calc(100vh - ${theme.spacing(8)})`,
    overflow: 'auto',
}));

export const PageContainer = styled(Box)(({ theme }) => ({
    height: `calc(100vh - ${theme.spacing(8)})`,
    overflow: 'hidden',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
}));

export const AppBar = styled(MuiAppBar)(({ theme }) => ({
    backgroundColor: 'transparent',
    color: theme.palette.primary.main,
    borderRadius: theme.spacing(2),
}));
