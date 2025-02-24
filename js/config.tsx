import { Plugin } from '../../../hat/assets/js/apps/Iaso/plugins/types';
import { menu } from './src/constants/menu';
import { routes } from './src/constants/routes';
import { theme } from './src/constants/theme';
import en from './src/constants/translations/en.json';
import fr from './src/constants/translations/fr.json';
import { baseUrls, paramsConfig } from './src/constants/urls';

const translations = {
    fr,
    en,
};

const config: Plugin = {
    baseUrls,
    paramsConfig,
    routes,
    redirections: [],
    menu,
    translations,
    homeUrl: '/snt_malaria/planning',
    theme,
};

export default config;
