import { userHasPermission } from 'Iaso/domains/users/utils';
import { useCurrentUser } from 'Iaso/utils/usersUtils';
import * as Permission from '../../../constants/permissions';
import { Scenario } from '../../scenarios/types';

/**
 * checks whether the current user is allowed to edit a scenario
 *
 * @param {Scenario} scenario
 * @return {Boolean}
 */
export const useUserCanEditScenario = (scenario?: Scenario): boolean => {
    const user = useCurrentUser();

    if (!scenario) {
        return false;
    }

    if (userHasPermission(Permission.SCENARIO_FULL_WRITE, user)) {
        return true;
    }

    if (
        userHasPermission(Permission.SCENARIO_BASIC_WRITE, user) &&
        scenario.created_by.id === user.id
    ) {
        return true;
    }

    return false;
};
