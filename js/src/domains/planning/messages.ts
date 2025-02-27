import { defineMessages } from 'react-intl';

export const MESSAGES = defineMessages({
    title: {
        id: 'iaso.snt_malaria.home.title',
        defaultMessage: 'SNT Malaria',
    },
    layers: {
        id: 'iaso.snt_malaria.label.layers',
        defaultMessage: 'Layers',
    },
    moreThan: {
        id: 'iaso.snt_malaria.label.layers.moreThan',
        defaultMessage: 'More than',
    },
    interventionMixTitle: {
        id: 'iaso.snt_malaria.label.interventionMix',
        defaultMessage: 'Intervention mix',
    },
    orgUnitDistrict: {
        id: 'iaso.snt_malaria.label.orgUnitDistricts',
        defaultMessage: 'Districts',
    },
    applyMixAndAddPlan: {
        id: 'iaso.snt_malaria.label.interventionMix.applyMixAndAddPlan',
        defaultMessage: 'Apply mix and add to plan',
    },
    overrideMix: {
        id: 'iaso.snt_malaria.label.interventionMix.overrideMix',
        defaultMessage: 'Override mix',
    },
    cancel: {
        defaultMessage: 'Cancel',
        id: 'iaso.label.cancel',
    },
    mixConflicts: {
        id: 'iaso.snt_malaria.label.interventionMix.mixConflicts',
        defaultMessage: 'Mix conflicts',
    },
    applyMixMessage: {
        id: 'iaso.snt_malaria.label.interventionMix.applyMixMessage',
        defaultMessage:
            'You’re about to apply intervention mix to districts that already have been applied a mix. Please review the ones to override.',
    },
    removeOrgUnitFromMix: {
        id: 'iaso.snt_malaria.label.interventionMix.removeOrgUnitFromMix',
        defaultMessage: 'Remove from mix',
    },
    addOrgUnitFromMix: {
        id: 'iaso.snt_malaria.label.interventionMix.addOrgUnitFromMix',
        defaultMessage: 'Add to mix',
    },
    interventionPlanTitle: {
        id: 'iaso.snt_malaria.label.interventionPlanTitle',
        defaultMessage: 'Intervention plan',
    },
    noPlanAvailable: {
        id: 'iaso.snt_malaria.label.noInterventionPlanAvailable',
        defaultMessage: 'No intervention plan available',
    },
});
