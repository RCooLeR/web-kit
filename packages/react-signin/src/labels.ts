// The texts of the sign-in card and the security panel. Every app shows the same ones, so both
// languages ship here; an app changes a few by spreading, as in
// `{ ...ukSignInLabels, resetHint: "..." }`. `{app}` and `{account}` are filled in by the component.

export interface SignInLabels {
  title: string;
  login: string;
  password: string;
  showPassword: string;
  hidePassword: string;
  submit: string;
  or: string;
  sso: string;
  ssoUnavailable: string;
  /** With an account field. */
  wrongLoginTitle: string;
  /** Without one: the app has a single owner account. */
  wrongPasswordTitle: string;
  wrongText: string;
  lockedTitle: string;
  lockedText: string;
  ssoFailedTitle: string;
  ssoFailedText: string;
  ssoAuthenticatorTitle: string;
  ssoAuthenticatorText: string;
  outageTitle: string;
  outageText: string;
  unavailableTitle: string;
  unavailableText: string;
  notConfiguredTitle: string;
  notConfiguredText: string;
  authenticatorOnTitle: string;
  authenticatorOnText: string;
  back: string;
  otherAccount: string;
  codeTitle: string;
  codeIntro: string;
  /** With an account field; `{account}` is the login typed. */
  codeIntroFor: string;
  code: string;
  badCode: string;
  confirm: string;
  noApp: string;
  resetHint: string;
  footNote: string;
}

export const defaultSignInLabels: SignInLabels = {
  title: "Sign in",
  login: "Login",
  password: "Password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  submit: "Sign in",
  or: "or",
  sso: "Sign in with RCooLeR SSO",
  ssoUnavailable: "RCooLeR SSO is unavailable",
  wrongLoginTitle: "Wrong login or password",
  wrongPasswordTitle: "Wrong password",
  wrongText: "Check the keyboard layout and Caps Lock.",
  lockedTitle: "Too many sign-in attempts",
  lockedText: "Try again in a few minutes. Sessions already open keep working.",
  ssoFailedTitle: "Could not sign in through RCooLeR SSO",
  ssoFailedText:
    "If your SSO account is not linked here yet, sign in with your password and link it under Sign-in security. The same email links nothing.",
  ssoAuthenticatorTitle: "Your account has an authenticator",
  ssoAuthenticatorText: "Sign in with your password and the code from the app.",
  outageTitle: "RCooLeR SSO is not answering",
  outageText:
    "Password sign-in works as always. The SSO button comes back once the service answers.",
  unavailableTitle: "Sign-in is not working right now",
  unavailableText: "The server could not check the account. Try again in a minute.",
  notConfiguredTitle: "No password is set",
  notConfiguredText: "The administrator sets it on the server.",
  authenticatorOnTitle: "The authenticator is on",
  authenticatorOnText: "Sign in again with your password and a code.",
  back: "Back",
  otherAccount: "Another account",
  codeTitle: "Authenticator code",
  codeIntro: "Enter the 6 digits your authenticator app shows now.",
  codeIntroFor: "Enter the 6 digits your authenticator app shows now for {account}.",
  code: "Code",
  badCode: "The code does not fit. Check the time on your phone and enter a fresh code.",
  confirm: "Confirm",
  noApp: "No access to the app?",
  resetHint: "The administrator turns the authenticator off with a command on the server.",
  footNote: "Accounts are created by the administrator.",
};

export const ukSignInLabels: SignInLabels = {
  title: "Вхід",
  login: "Логін",
  password: "Пароль",
  showPassword: "Показати пароль",
  hidePassword: "Сховати пароль",
  submit: "Увійти",
  or: "або",
  sso: "Увійти через RCooLeR SSO",
  ssoUnavailable: "RCooLeR SSO недоступний",
  wrongLoginTitle: "Неправильний логін або пароль",
  wrongPasswordTitle: "Неправильний пароль",
  wrongText: "Перевірте розкладку й Caps Lock.",
  lockedTitle: "Забагато спроб входу",
  lockedText: "Спробуйте знову за кілька хвилин. Уже відкриті сеанси працюють далі.",
  ssoFailedTitle: "Не вдалося увійти через RCooLeR SSO",
  ssoFailedText:
    "Якщо ваш обліковий запис SSO тут ще не пов’язаний, увійдіть паролем і пов’яжіть його в розділі «Безпека входу». Однакова пошта нічого не пов’язує.",
  ssoAuthenticatorTitle: "Ваш обліковий запис має автентифікатор",
  ssoAuthenticatorText: "Увійдіть паролем і кодом із застосунку.",
  outageTitle: "RCooLeR SSO зараз не відповідає",
  outageText: "Вхід паролем працює як завжди. Кнопка SSO оживе, щойно служба відповість.",
  unavailableTitle: "Вхід зараз не працює",
  unavailableText: "Сервер не зміг перевірити обліковий запис. Спробуйте за хвилину.",
  notConfiguredTitle: "Пароль не задано",
  notConfiguredText: "Його задає адміністратор на сервері.",
  authenticatorOnTitle: "Автентифікатор увімкнено",
  authenticatorOnText: "Увійдіть знову паролем і кодом.",
  back: "Назад",
  otherAccount: "Інший обліковий запис",
  codeTitle: "Код автентифікатора",
  codeIntro: "Введіть 6 цифр, які зараз показує застосунок автентифікації.",
  codeIntroFor: "Введіть 6 цифр, які зараз показує застосунок автентифікації для {account}.",
  code: "Код",
  badCode: "Код не підходить. Звірте час на телефоні й введіть свіжий код.",
  confirm: "Підтвердити",
  noApp: "Немає доступу до застосунку?",
  resetHint: "Адміністратор вимикає автентифікатор командою на сервері.",
  footNote: "Облікові записи створює адміністратор.",
};

export interface SecurityLabels {
  title: string;
  authenticatorTitle: string;
  authenticatorIntro: string;
  stateOff: string;
  stateSetup: string;
  stateOn: string;
  anyApp: string;
  notAvailable: string;
  turnOn: string;
  scanStep: string;
  qrLabel: string;
  manualKey: string;
  copyKey: string;
  copied: string;
  /** `{name}` is the entry the app shows, such as "Herald (owner)". */
  nameInApp: string;
  codeStep: string;
  password: string;
  code: string;
  cancel: string;
  /** `{app}` is the app's name. */
  keyOnce: string;
  onSince: string;
  turnOffIntro: string;
  turnOff: string;
  wrongPassword: string;
  badCode: string;
  setupExpired: string;
  locked: string;
  unavailable: string;
  ssoTitle: string;
  ssoIntro: string;
  linked: string;
  notLinked: string;
  linkIntro: string;
  link: string;
  ssoAccount: string;
  /** `{date}` is the day it was linked. */
  linkedOn: string;
  byOperator: string;
  ssoDownNote: string;
  unlink: string;
  linkDone: string;
  linkFailed: string;
  linkConflict: string;
  ssoOutage: string;
  retry: string;
}

export const defaultSecurityLabels: SecurityLabels = {
  title: "Sign-in security",
  authenticatorTitle: "Authenticator app",
  authenticatorIntro: "After the password, sign-in asks for a 6-digit code from your phone.",
  stateOff: "off",
  stateSetup: "setting up",
  stateOn: "on",
  anyApp: "Any TOTP app works: Google Authenticator, Aegis, 1Password, Microsoft Authenticator.",
  notAvailable:
    "The authenticator needs a key file on the server and a password; the administrator sets them up.",
  turnOn: "Turn on",
  scanStep: "1. Scan the QR code in the app",
  qrLabel: "QR code for the authenticator app",
  manualKey: "Does not scan? Enter the key by hand:",
  copyKey: "Copy the key",
  copied: "Copied",
  nameInApp: "Name in the app: {name}",
  codeStep: "2. Enter your password and the code the app shows",
  password: "Password",
  code: "Code",
  cancel: "Cancel",
  keyOnce: "The key shows only now. {app} keeps it encrypted.",
  onSince: "On",
  turnOffIntro: "To turn it off, enter your password and a current code",
  turnOff: "Turn off",
  wrongPassword: "Wrong password.",
  badCode: "The code does not fit. Check the time on your phone and enter a fresh code.",
  setupExpired: "The setup took too long. Start it again.",
  locked: "Too many attempts. Try again in a few minutes.",
  unavailable: "The server cannot check the authenticator right now. Try again in a minute.",
  ssoTitle: "RCooLeR SSO",
  ssoIntro: "Sign in with the “Sign in with RCooLeR SSO” button.",
  linked: "linked",
  notLinked: "not linked",
  linkIntro:
    "Press “Link” and sign in to RCooLeR SSO: this account is linked to exactly the one you sign in with there. The same email links nothing.",
  link: "Link with RCooLeR SSO",
  ssoAccount: "SSO account",
  linkedOn: "linked on {date}",
  byOperator: "by the administrator",
  ssoDownNote: "When SSO is unavailable, sign in with your password and code as before.",
  unlink: "Unlink",
  linkDone: "The SSO account is linked.",
  linkFailed: "The SSO account was not linked. Try again.",
  linkConflict: "This SSO account is already linked to another account here.",
  ssoOutage: "RCooLeR SSO is not answering. Try again later.",
  retry: "Try again",
};

export const ukSecurityLabels: SecurityLabels = {
  title: "Безпека входу",
  authenticatorTitle: "Застосунок автентифікації",
  authenticatorIntro: "Після пароля вхід питатиме 6-значний код із телефона.",
  stateOff: "вимкнено",
  stateSetup: "налаштування",
  stateOn: "увімкнено",
  anyApp:
    "Підійде будь-який застосунок TOTP: Google Authenticator, Aegis, 1Password, Microsoft Authenticator.",
  notAvailable:
    "Автентифікатору потрібні файл ключа на сервері й пароль; їх налаштовує адміністратор.",
  turnOn: "Увімкнути",
  scanStep: "1. Відскануйте QR-код у застосунку",
  qrLabel: "QR-код для застосунку автентифікації",
  manualKey: "Не сканується? Введіть ключ вручну:",
  copyKey: "Скопіювати ключ",
  copied: "Скопійовано",
  nameInApp: "Назва в застосунку: {name}",
  codeStep: "2. Введіть пароль і код, який показав застосунок",
  password: "Пароль",
  code: "Код",
  cancel: "Скасувати",
  keyOnce: "Ключ видно лише зараз. {app} зберігає його зашифрованим.",
  onSince: "Увімкнено",
  turnOffIntro: "Щоб вимкнути, введіть пароль і поточний код",
  turnOff: "Вимкнути",
  wrongPassword: "Неправильний пароль.",
  badCode: "Код не підходить. Звірте час на телефоні й введіть свіжий код.",
  setupExpired: "Налаштування тривало задовго. Почніть знову.",
  locked: "Забагато спроб. Спробуйте за кілька хвилин.",
  unavailable: "Сервер зараз не може перевірити автентифікатор. Спробуйте за хвилину.",
  ssoTitle: "RCooLeR SSO",
  ssoIntro: "Вхід кнопкою «Увійти через RCooLeR SSO».",
  linked: "пов’язано",
  notLinked: "не пов’язано",
  linkIntro:
    "Натисніть «Пов’язати» й увійдіть у RCooLeR SSO: цей обліковий запис буде пов’язано саме з тим, яким ви там увійшли. Однакова пошта нічого не пов’язує.",
  link: "Пов’язати з RCooLeR SSO",
  ssoAccount: "Обліковий запис SSO",
  linkedOn: "пов’язано {date}",
  byOperator: "адміністратором",
  ssoDownNote: "Коли SSO недоступний, входьте паролем і кодом, як раніше.",
  unlink: "Відв’язати",
  linkDone: "Обліковий запис SSO пов’язано.",
  linkFailed: "Обліковий запис SSO не пов’язано. Спробуйте ще раз.",
  linkConflict: "Цей обліковий запис SSO вже пов’язаний з іншим обліковим записом тут.",
  ssoOutage: "RCooLeR SSO зараз не відповідає. Спробуйте пізніше.",
  retry: "Спробувати ще раз",
};

/** Fills `{name}` placeholders; one left without a value stays visible. */
export function fillText(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder);
}
