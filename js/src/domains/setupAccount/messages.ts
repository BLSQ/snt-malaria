import { defineMessages } from 'react-intl';

export const MESSAGES = defineMessages({
    appName: {
        id: 'iaso.snt_malaria.appName',
        defaultMessage: 'SNT Malaria Explorer',
    },
    title: {
        id: 'iaso.snt_malaria.setupAccount.title',
        defaultMessage: 'Create your SNT Malaria account',
    },
    intro: {
        id: 'iaso.snt_malaria.setupAccount.intro',
        defaultMessage:
            'Fill in the form below to create a new SNT Malaria account for your country. The administrative boundaries will be imported from the GeoJSON file you provide.',
    },
    country: {
        id: 'iaso.snt_malaria.setupAccount.country',
        defaultMessage: 'Country',
    },
    countryPlaceholder: {
        id: 'iaso.snt_malaria.setupAccount.countryPlaceholder',
        defaultMessage: 'Select a country',
    },
    username: {
        id: 'iaso.snt_malaria.setupAccount.username',
        defaultMessage: 'Username',
    },
    password: {
        id: 'iaso.snt_malaria.setupAccount.password',
        defaultMessage: 'Password',
    },
    passwordConfirmation: {
        id: 'iaso.snt_malaria.setupAccount.passwordConfirmation',
        defaultMessage: 'Repeat password',
    },
    passwordsMustMatch: {
        id: 'iaso.snt_malaria.setupAccount.passwordsMustMatch',
        defaultMessage: 'Passwords must match',
    },
    language: {
        id: 'iaso.snt_malaria.setupAccount.language',
        defaultMessage: 'Language',
    },
    geoJsonFile: {
        id: 'iaso.snt_malaria.setupAccount.geoJsonFile',
        defaultMessage: 'GeoJSON administrative boundaries',
    },
    geoJsonFileHelp: {
        id: 'iaso.snt_malaria.setupAccount.geoJsonFileHelp',
        defaultMessage:
            'Upload a .json or .geojson FeatureCollection of level-2 boundaries with ADM0/ADM1/ADM2 ID, NAME, and LEVEL_NAME properties on every feature.',
    },
    invalidGeoJsonExtension: {
        id: 'iaso.snt_malaria.setupAccount.invalidGeoJsonExtension',
        defaultMessage: 'File must end with .json or .geojson',
    },
    submit: {
        id: 'iaso.snt_malaria.setupAccount.submit',
        defaultMessage: 'Create account',
    },
    creating: {
        id: 'iaso.snt_malaria.setupAccount.creating',
        defaultMessage: 'Creating your account...',
    },
    requiredField: {
        id: 'iaso.snt_malaria.setupAccount.requiredField',
        defaultMessage: 'This field is required',
    },
    autoLoginFailed: {
        id: 'iaso.snt_malaria.setupAccount.autoLoginFailed',
        defaultMessage:
            'Your account was created but we could not log you in automatically. Please go to the login page.',
    },
    goToLogin: {
        id: 'iaso.snt_malaria.setupAccount.goToLogin',
        defaultMessage: 'Go to login',
    },
    captchaCode: {
        id: 'iaso.snt_malaria.setupAccount.captchaCode',
        defaultMessage: 'CAPTCHA',
    },
    captchaRefresh: {
        id: 'iaso.snt_malaria.setupAccount.captchaRefresh',
        defaultMessage: 'New captcha image',
    },
    captchaHelp: {
        id: 'iaso.snt_malaria.setupAccount.captchaHelp',
        defaultMessage:
            'Solve the CAPTCHA before you can continue. Click the refresh button to generate a new image.',
    },
    captchaLoadError: {
        id: 'iaso.snt_malaria.setupAccount.captchaLoadError',
        defaultMessage: 'Could not load CAPTCHA. Try again.',
    },
});
