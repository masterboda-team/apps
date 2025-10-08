import { DashboardTokenPayload } from "./verify-jwt";

/**
 * Takes user token that Dashboard provides via AppBridge (decoded).
 * Checks token expiration and throws if expired
 */
export const verifyTokenExpiration = (token: DashboardTokenPayload) => {
  const tokenExpiration = token.exp;
  const now = new Date();
  const nowTimestamp = now.valueOf();

  if (!tokenExpiration) {
    throw new Error('Missing "exp" field in token');
  }

  /**
   * Timestamp in token are in seconds, but timestamp from Date is in milliseconds
   */
  const tokenMsTimestamp = tokenExpiration * 1000;

  if (tokenMsTimestamp <= nowTimestamp) {
    throw new Error("Token is expired");
  }
};
