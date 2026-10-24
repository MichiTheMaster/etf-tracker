import de from "./de";
import en from "./en";
import { setLanguage, t } from "./index";

function flatten(source, prefix = "") {
  return Object.entries(source).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null
      ? flatten(value, path)
      : [path];
  });
}

describe("i18n t()", () => {
  afterEach(() => {
    setLanguage("de");
  });

  test("resolves nested German keys", () => {
    expect(t("common.save")).toBe("Speichern");
  });

  test("switches to English", () => {
    setLanguage("en");
    expect(t("common.save")).toBe("Save");
    expect(t("nav.overview")).toBe("Overview");
  });

  test("interpolates variables", () => {
    expect(t("portfolio.soldAtCost", { symbol: "ZDI.TO", quantity: 40, price: "31,39 €" }))
      .toContain("ZDI.TO");
  });

  test("returns the key when missing", () => {
    expect(t("does.not.exist")).toBe("does.not.exist");
  });

  test("English dictionary covers the same keys as German", () => {
    expect(flatten(en).sort()).toEqual(flatten(de).sort());
  });
});
