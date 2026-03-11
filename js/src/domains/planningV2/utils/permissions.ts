import { userHasPermission } from 'Iaso/domains/users/utils';
import * as Permission from '../../../constants/permissions';
import { Scenario } from '../../scenarios/types';
import { User } from 'Iaso/utils/usersUtils';

/**
 * check if user has the permission to edit this scenario
 *
 * @param {Scenario} scenario
 * @param {User} user
 * @return {Boolean}
 */
export const userCanEditScenario = (scenario: Scenario | undefined, user: User) => {
    if (!user || !scenario) {
        return false;
    }

    if (userHasPermission([Permission.SCENARIO_FULL_WRITE], user)) {
        return true;
    }

    if (userHasPermission([Permission.SCENARIO_BASIC_WRITE], user) && (scenario.created_by.id === user.id)) {
        return true;
    }

    return false;
};
