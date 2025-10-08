import { type Permission } from "@saleor/app-sdk/types";

import { DashboardTokenPayload } from "./verify-jwt";

/**
 * Takes decoded JWT token that Dashboard provides via AppBridge.
 * Compare permissions against required in parameter
 */
export const hasPermissionsInJwtToken = (
  tokenData?: Pick<DashboardTokenPayload, "user_permissions">,
  permissionsToCheckAgainst?: Permission[],
) => {
  if (!permissionsToCheckAgainst?.length) {
    return true;
  }

  const userPermissions = tokenData?.user_permissions || undefined;

  if (!userPermissions?.length) {
    return false;
  }

  const arePermissionsSatisfied = permissionsToCheckAgainst.every((permission) =>
    userPermissions.includes(permission),
  );

  if (!arePermissionsSatisfied) {
    return false;
  }

  return true;
};
