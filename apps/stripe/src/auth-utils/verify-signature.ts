import * as jose from "jose";

/**
 * Verify the Webhook payload signature from provided JWKS string.
 * JWKS can be cached to avoid unnecessary calls.
 */
export const verifySignatureWithJwks = async (jwks: string, signature: string, rawBody: string) => {
  const [header, , jwsSignature] = signature.split(".");
  const jws: jose.FlattenedJWSInput = {
    protected: header,
    payload: rawBody,
    signature: jwsSignature,
  };

  let localJwks: jose.FlattenedVerifyGetKey;

  try {
    const parsedJWKS = JSON.parse(jwks);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localJwks = jose.createLocalJWKSet(parsedJWKS as any) as jose.FlattenedVerifyGetKey;
  } catch {
    throw new Error("JWKS verification failed - could not parse given JWKS");
  }

  try {
    await jose.flattenedVerify(jws, localJwks);
  } catch {
    throw new Error("JWKS verification failed");
  }
};

export const getJwksUrlFromSaleorApiUrl = (saleorApiUrl: string): string => {
  const url = new URL(saleorApiUrl);
  const cleanedPath = url.pathname.replace(/\/graphql\/?$/, "");
  const basePath = cleanedPath.endsWith("/") ? cleanedPath.slice(0, -1) : cleanedPath;

  return `${url.origin}${basePath}/.well-known/jwks.json`;
};
