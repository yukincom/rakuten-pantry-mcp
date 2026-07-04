/**
 * Rakuten Web Service auth.
 *
 * All public Rakuten Web Service endpoints authenticate via two query parameters:
 *   - applicationId  (free, register at https://webservice.rakuten.co.jp/)
 *   - accessKey      (issued with the applicationId)
 *
 * Some new-host endpoints also accept the access key in an `X-RWS-AccessKey`
 * header. We always send it as a query parameter for maximum compatibility
 * across the legacy and new hosts.
 */

export interface AuthParams {
  applicationId: string;
  accessKey: string;
  affiliateId?: string;
}

/**
 * Append auth params to a URLSearchParams object.
 * Mutates the passed-in params for convenience.
 */
export function appendAuthParams(params: URLSearchParams, auth: AuthParams): void {
  params.set("applicationId", auth.applicationId);
  params.set("accessKey", auth.accessKey);
  if (auth.affiliateId) {
    params.set("affiliateId", auth.affiliateId);
  }
}
