import { userHasPermission } from 'Iaso/domains/users/utils';
import * as Permission from '../../../constants/permissions';
import { Scenario } from '../../scenarios/types';
import { useCurrentUser } from 'Iaso/utils/usersUtils';

/**
 * checks whether the current user is allowed to edit a scenario
 *
 * @param {Scenario} scenario
 * @return {Boolean}
 */
export const useUserCanEditScenario = (scenario: Scenario | undefined) => {
    if (!scenario) {
        return false;
    }

    const user = useCurrentUser();

    if (userHasPermission(Permission.SCENARIO_FULL_WRITE, user)) {
        return true;
    }

    if (userHasPermission(Permission.SCENARIO_BASIC_WRITE, user) && (scenario.created_by.id === user.id)) {
        return true;
    }

    return false;
};
