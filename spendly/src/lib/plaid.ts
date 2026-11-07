import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Plaid Link is a native module, so it only exists in a development / App Store
 * build of this app, not in Expo Go. We load it lazily so the rest of the app
 * (including demo mode) still works inside Expo Go.
 */
export const plaidAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export interface LinkResult {
  publicToken: string;
  institutionName?: string;
}

export async function openPlaidLink(linkToken: string): Promise<LinkResult | null> {
  if (!plaidAvailable) {
    throw new Error("Bank linking needs the installed Spendly app (a development build). It does not work inside Expo Go.");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdk = require("react-native-plaid-link-sdk") as typeof import("react-native-plaid-link-sdk");
  return new Promise<LinkResult | null>((resolve, reject) => {
    sdk
      .createPlaidLinkSession({
        token: linkToken,
        onSuccess: (success) =>
          resolve({ publicToken: success.publicToken, institutionName: success.metadata.institution?.name }),
        onExit: () => resolve(null),
        onEvent: () => {},
      })
      .then((session) => session.open(false))
      .catch(reject);
  });
}
