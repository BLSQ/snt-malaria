import { useSafeIntl } from 'bluesquare-components';
import { DropdownOptions } from 'Iaso/types/utils';
import { pluralize } from '../../../utils/pluralize';
import { MESSAGES } from '../../messages';

type FormatMessage = ReturnType<typeof useSafeIntl>['formatMessage'];

// "Item" is the seeded default unit; accounts that renamed or removed it
// fall back to their first unit.
const DEFAULT_COST_UNIT_LABEL = 'Item';

export const getDefaultCostUnitType = (
    costUnitTypeOptions: DropdownOptions<string>[],
): DropdownOptions<string> | undefined =>
    costUnitTypeOptions.find(
        option => option.label === DEFAULT_COST_UNIT_LABEL,
    ) ?? costUnitTypeOptions[0];

export const formatConversionDirection = (
    formatMessage: FormatMessage,
    unitLabel: string,
    conversionFactor: number | string,
    isInverted: boolean,
): string =>
    isInverted
        ? formatMessage(MESSAGES.budgetingCostLinePeoplePerUnit, {
              unit: unitLabel,
          })
        : formatMessage(MESSAGES.budgetingCostLineUnitPerPeople, {
              unit: pluralize(unitLabel, Number(conversionFactor) || 1),
          });
