import { defineMessages } from 'react-intl';

export const MESSAGES = defineMessages({
    appName: {
        id: 'iaso.snt_malaria.appName',
        defaultMessage: 'SNT Malaria Explorer',
    },
    title: {
        id: 'iaso.snt_malaria.configureAccount.title',
        defaultMessage: 'Finish setting up your account',
    },

    // Stepper labels
    stepUserInfo: {
        id: 'iaso.snt_malaria.configureAccount.stepUserInfo',
        defaultMessage: 'Your information',
    },
    stepImportBoundaries: {
        id: 'iaso.snt_malaria.configureAccount.stepImportBoundaries',
        defaultMessage: 'Import',
    },
    stepAccountSettings: {
        id: 'iaso.snt_malaria.configureAccount.stepAccountSettings',
        defaultMessage: 'Account settings',
    },
    stepBudgetSettings: {
        id: 'iaso.snt_malaria.configureAccount.stepBudgetSettings',
        defaultMessage: 'Budget settings',
    },

    // User info step
    userInfoTitle: {
        id: 'iaso.snt_malaria.configureAccount.userInfoTitle',
        defaultMessage: 'Tell us about yourself',
    },
    userInfoDescription: {
        id: 'iaso.snt_malaria.configureAccount.userInfoDescription',
        defaultMessage:
            'Optional. These details will be associated with your account. You can skip this step.',
    },
    firstName: {
        id: 'iaso.snt_malaria.configureAccount.firstName',
        defaultMessage: 'First name',
    },
    lastName: {
        id: 'iaso.snt_malaria.configureAccount.lastName',
        defaultMessage: 'Last name',
    },
    email: {
        id: 'iaso.snt_malaria.configureAccount.email',
        defaultMessage: 'Email',
    },
    invalidEmail: {
        id: 'iaso.snt_malaria.configureAccount.invalidEmail',
        defaultMessage: 'Enter a valid email address',
    },

    // Account settings step (existing)
    importTitle: {
        id: 'iaso.snt_malaria.configureAccount.importTitle',
        defaultMessage: 'Importing administrative boundaries...',
    },
    importDescription: {
        id: 'iaso.snt_malaria.configureAccount.importDescription',
        defaultMessage:
            'We are importing the boundaries from the GeoJSON file you uploaded. This usually takes less than a minute.',
    },
    importErrored: {
        id: 'iaso.snt_malaria.configureAccount.importErrored',
        defaultMessage: 'The import failed.',
    },
    importKilled: {
        id: 'iaso.snt_malaria.configureAccount.importKilled',
        defaultMessage: 'The import was cancelled.',
    },
    importSuccessTitle: {
        id: 'iaso.snt_malaria.configureAccount.importSuccessTitle',
        defaultMessage: 'Import complete',
    },
    importSuccessDescription: {
        id: 'iaso.snt_malaria.configureAccount.importSuccessDescription',
        defaultMessage:
            'Your administrative boundaries have been imported successfully. Continue to the next step to configure your account.',
    },
    configureTitle: {
        id: 'iaso.snt_malaria.configureAccount.configureTitle',
        defaultMessage: 'Account settings',
    },
    configureDescription: {
        id: 'iaso.snt_malaria.configureAccount.configureDescription',
        defaultMessage:
            'Pick the administrative levels we will use to draw your map and to plan interventions.',
    },
    focusOrgUnitType: {
        id: 'iaso.snt_malaria.configureAccount.focusOrgUnitType',
        defaultMessage: 'Map zoom option',
    },
    focusOrgUnitTypeHelp: {
        id: 'iaso.snt_malaria.configureAccount.focusOrgUnitTypeHelp',
        defaultMessage:
            'On the map, a dropdown lets you zoom into any single area at this level (e.g. zoom into a specific region).',
    },
    interventionOrgUnitType: {
        id: 'iaso.snt_malaria.configureAccount.interventionOrgUnitType',
        defaultMessage: 'Intervention level',
    },
    interventionOrgUnitTypeHelp: {
        id: 'iaso.snt_malaria.configureAccount.interventionOrgUnitTypeHelp',
        defaultMessage:
            'Interventions and budgets are planned at this level (e.g. district). Usually the most detailed level you imported.',
    },

    // Budget settings step
    budgetSettingsTitle: {
        id: 'iaso.snt_malaria.configureAccount.budgetSettingsTitle',
        defaultMessage: 'Budget settings',
    },
    budgetSettingsDescription: {
        id: 'iaso.snt_malaria.configureAccount.budgetSettingsDescription',
        defaultMessage:
            'Set the currency and rates used to compute intervention costs and projections.',
    },
    localCurrency: {
        id: 'iaso.snt_malaria.configureAccount.localCurrency',
        defaultMessage: 'Local currency (ISO code)',
    },
    localCurrencyHelp: {
        id: 'iaso.snt_malaria.configureAccount.localCurrencyHelp',
        defaultMessage: 'Three-letter code, e.g. USD, EUR, XOF.',
    },
    exchangeRate: {
        id: 'iaso.snt_malaria.configureAccount.exchangeRate',
        defaultMessage: 'Exchange rate (local per USD)',
    },
    inflationRate: {
        id: 'iaso.snt_malaria.configureAccount.inflationRate',
        defaultMessage: 'Annual inflation rate',
    },
    inflationRateHelp: {
        id: 'iaso.snt_malaria.configureAccount.inflationRateHelp',
        defaultMessage: 'Decimal value, e.g. 0.03 for 3%.',
    },
    invalidNumber: {
        id: 'iaso.snt_malaria.configureAccount.invalidNumber',
        defaultMessage: 'Enter a valid number',
    },
    invalidCurrencyCode: {
        id: 'iaso.snt_malaria.configureAccount.invalidCurrencyCode',
        defaultMessage: 'Use a 3-letter currency code',
    },

    // Buttons
    next: {
        id: 'iaso.snt_malaria.configureAccount.next',
        defaultMessage: 'Next',
    },
    saving: {
        id: 'iaso.snt_malaria.configureAccount.saving',
        defaultMessage: 'Saving...',
    },
    finish: {
        id: 'iaso.snt_malaria.configureAccount.finish',
        defaultMessage: 'Finish',
    },

    // Errors / restart
    missingTaskId: {
        id: 'iaso.snt_malaria.configureAccount.missingTaskId',
        defaultMessage: 'No task id was provided.',
    },
    errorHelpSuffix: {
        id: 'iaso.snt_malaria.configureAccount.errorHelpSuffix',
        defaultMessage:
            'Restart the process, or contact your administrator if the problem persists.',
    },
    restart: {
        id: 'iaso.snt_malaria.configureAccount.restart',
        defaultMessage: 'Restart account creation',
    },
    requiredField: {
        id: 'iaso.snt_malaria.configureAccount.requiredField',
        defaultMessage: 'This field is required',
    },
});
