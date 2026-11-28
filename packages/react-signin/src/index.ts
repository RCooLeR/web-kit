// @rcooler/react-signin: the shared sign-in. Every app answers the same API (README "Sign-in"),
// so one card and one panel fit all of them. The app loads "@rcooler/react-ui/kit.css" and
// "@rcooler/react-signin/signin.css"; a brand only sets tokens.

export { NO_FEDERATION, createSignInApi, errorCode } from "./api.js";
export type {
  AuthenticatorSetup,
  AuthenticatorStatus,
  FederationStart,
  FederationStatus,
  LinkStatus,
  SessionState,
  SignInApi,
} from "./api.js";
export {
  defaultSecurityLabels,
  defaultSignInLabels,
  fillText,
  ukSecurityLabels,
  ukSignInLabels,
} from "./labels.js";
export type { SecurityLabels, SignInLabels } from "./labels.js";
export {
  clearFederationResult,
  passiveCheckDone,
  readFederationResult,
  skipPassiveCheck,
} from "./result.js";
export type { FederationResult, LinkResult, SignInResult } from "./result.js";
export { SecurityPanel } from "./SecurityPanel.js";
export type { SecurityPanelProps } from "./SecurityPanel.js";
export { SignInCard } from "./SignInCard.js";
export type { SignInCardProps } from "./SignInCard.js";
