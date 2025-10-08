import { Permission } from "@saleor/app-sdk/types";
import * as jose from "jose";

import { hasPermissionsInJwtToken } from "./has-permissions-in-jwt-token";
import { getJwksUrlFromSaleorApiUrl } from "./verify-signature";
import { verifyTokenExpiration } from "./verify-token-expiration";

export interface DashboardTokenPayload extends jose.JWTPayload {
  app: string;
  user_permissions: Permission[];
}

export interface verifyJWTArguments {
  appId: string;
  saleorApiUrl: string;
  token: string;
  requiredPermissions?: Permission[];
}

export const verifyJWT = async ({
  saleorApiUrl,
  token,
  appId,
  requiredPermissions,
}: verifyJWTArguments) => {
  let tokenClaims: DashboardTokenPayload;
  const ERROR_MESSAGE = "JWT verification failed:";

  try {
    tokenClaims = jose.decodeJwt(token as string) as DashboardTokenPayload;
  } catch {
    throw new Error(`${ERROR_MESSAGE} Could not decode authorization token.`);
  }

  try {
    verifyTokenExpiration(tokenClaims);
  } catch (e) {
    throw new Error(`${ERROR_MESSAGE} ${(e as Error).message}`);
  }

  if (tokenClaims.app !== appId) {
    throw new Error(`${ERROR_MESSAGE} Token's app property is different than app ID.`);
  }

  if (!hasPermissionsInJwtToken(tokenClaims, requiredPermissions)) {
    throw new Error(`${ERROR_MESSAGE} Token's permissions are not sufficient.`);
  }

  try {
    const url = new URL(getJwksUrlFromSaleorApiUrl(saleorApiUrl));
    const JWKS = jose.createRemoteJWKSet(url);

    await jose.jwtVerify(token, JWKS);
  } catch {
    throw new Error(`${ERROR_MESSAGE} JWT signature verification failed.`);
  }
};
