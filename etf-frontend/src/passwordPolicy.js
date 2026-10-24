import { t } from "./i18n";

const SPECIAL_CHARACTER_PATTERN = /[!@#$%^&*()_+\-=[\]{}|;':",./<>?]/;

export function validatePassword(password) {
  if (!password || password.length < 8) {
    return t("password.minLength");
  }
  if (!/[A-Z]/.test(password)) {
    return t("password.upper");
  }
  if (!/[a-z]/.test(password)) {
    return t("password.lower");
  }
  if (!/\d/.test(password)) {
    return t("password.number");
  }
  if (!SPECIAL_CHARACTER_PATTERN.test(password)) {
    return t("password.special");
  }
  return "";
}
