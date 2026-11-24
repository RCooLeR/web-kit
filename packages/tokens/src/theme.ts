// The theme values: colour roles for light and dark, shadows, radii, spacing and the font. This
// file is the single source; the CSS and the JSON export are generated from it.
//
// The colours are a validated set (colour-blind separation of the series, contrast of text and
// status colours against `surface` in both schemes). Change a series, a status colour or
// `surface` only together with the others, and validate again. Native apps read the same roles
// from the JSON export.

/** A colour as `#rrggbb` or, when translucent, `#rrggbbaa`: valid CSS and easy to turn into ARGB. */
export type HexColor = `#${string}`;

/** The colour roles of one scheme. */
export interface ColorRoles {
  /** Page background behind everything. */
  page: HexColor;
  /** Background of cards and panels. */
  surface: HexColor;
  /** Background of what floats above a surface: dialogs, menus. */
  surfaceRaised: HexColor;
  /** Background of wells, table headers and inactive tracks. */
  surfaceSunken: HexColor;
  text: HexColor;
  textSecondary: HexColor;
  textMuted: HexColor;
  border: HexColor;
  borderStrong: HexColor;
  /** Chart grid lines and axes. */
  grid: HexColor;
  axis: HexColor;
  /** The brand colour: primary buttons, active navigation, focus. */
  accent: HexColor;
  /** Hover and pressed state of an accent surface. */
  accentStrong: HexColor;
  /** Accent as text on a surface: links. */
  accentText: HexColor;
  /** A tinted background for accent-related notices and selections. */
  accentSoft: HexColor;
  /** Text and icons on an accent surface. */
  onAccent: HexColor;
  /** Chart series in the order to use them; `seriesOther` is the remainder bucket. */
  series: readonly [HexColor, HexColor, HexColor, HexColor, HexColor, HexColor, HexColor, HexColor];
  seriesOther: HexColor;
  /** Status as a fill (dots, bars) and as text on a surface. */
  statusGood: HexColor;
  statusGoodText: HexColor;
  statusWarning: HexColor;
  statusWarningText: HexColor;
  statusCritical: HexColor;
  statusCriticalText: HexColor;
  /** Unfilled part of a progress track, by state. */
  trackOk: HexColor;
  trackWarning: HexColor;
  trackCritical: HexColor;
  /** Background of an inline notice, by kind. */
  noticeError: HexColor;
  noticeWarning: HexColor;
  noticeInfo: HexColor;
  noticeGood: HexColor;
  /** The dimmed layer behind a dialog. */
  backdrop: HexColor;
}

/** One colour scheme: its colours and the shadows that go with them. */
export interface Scheme {
  color: ColorRoles;
  shadow: {
    /** Resting cards. */
    card: string;
    /** Dialogs and menus. */
    pop: string;
  };
}

export const light: Scheme = {
  color: {
    page: "#f1f3f8",
    surface: "#fcfcfb",
    surfaceRaised: "#ffffff",
    surfaceSunken: "#e9ecf3",
    text: "#0f1420",
    textSecondary: "#474c59",
    textMuted: "#5f6675",
    border: "#0f142017",
    borderStrong: "#0f142033",
    grid: "#e1e0d9",
    axis: "#c3c2b7",
    accent: "#2a78d6",
    accentStrong: "#1c5cab",
    accentText: "#1c5cab",
    accentSoft: "#e3eefc",
    onAccent: "#ffffff",
    series: [
      "#2a78d6",
      "#eb6834",
      "#1baf7a",
      "#eda100",
      "#e87ba4",
      "#008300",
      "#6250d6",
      "#e34948",
    ],
    seriesOther: "#898781",
    statusGood: "#0ca30c",
    statusGoodText: "#006300",
    statusWarning: "#fab219",
    statusWarningText: "#7a5200",
    statusCritical: "#d03b3b",
    statusCriticalText: "#a82525",
    trackOk: "#cde2fb",
    trackWarning: "#fdeccb",
    trackCritical: "#f6d5d5",
    noticeError: "#fbe9e9",
    noticeWarning: "#fdf3dc",
    noticeInfo: "#e6f0fd",
    noticeGood: "#e3f4e3",
    backdrop: "#090d1680",
  },
  shadow: {
    card: "0 1px 2px rgba(15, 20, 32, 0.04), 0 2px 10px rgba(15, 20, 32, 0.04)",
    pop: "0 12px 32px rgba(15, 20, 32, 0.18)",
  },
};

export const dark: Scheme = {
  color: {
    page: "#0d0e11",
    surface: "#1a1a19",
    surfaceRaised: "#232322",
    surfaceSunken: "#27282b",
    text: "#f0efec",
    textSecondary: "#c3c2b7",
    textMuted: "#a3a199",
    border: "#ffffff1a",
    borderStrong: "#ffffff3d",
    grid: "#2c2c2a",
    axis: "#383835",
    accent: "#3987e5",
    accentStrong: "#5a9cec",
    accentText: "#86b6ef",
    accentSoft: "#12294a",
    onAccent: "#ffffff",
    series: [
      "#3987e5",
      "#d95926",
      "#199e70",
      "#c98500",
      "#d55181",
      "#0ca30c",
      "#9085e9",
      "#e66767",
    ],
    seriesOther: "#898781",
    statusGood: "#0ca30c",
    statusGoodText: "#4fc24f",
    statusWarning: "#fab219",
    statusWarningText: "#f3c35b",
    statusCritical: "#d03b3b",
    statusCriticalText: "#ee8a8a",
    trackOk: "#0d366b",
    trackWarning: "#4a3a10",
    trackCritical: "#4a1a1a",
    noticeError: "#3a1717",
    noticeWarning: "#3a2f10",
    noticeInfo: "#12294a",
    noticeGood: "#123312",
    backdrop: "#00000099",
  },
  shadow: {
    card: "none",
    pop: "0 12px 32px rgba(0, 0, 0, 0.5)",
  },
};

/** Values that do not change with the colour scheme. */
export const base = {
  radius: {
    /** Cards, dialogs. */
    card: "16px",
    /** Buttons, inputs. */
    control: "10px",
  },
  spacing: {
    /** The gap between cards and between form rows. */
    gap: "16px",
  },
  font: {
    family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    size: "16px",
    lineHeight: "1.45",
  },
} as const;

/** Everything the theme defines; this object is the JSON export. */
export const tokens = { light, dark, ...base } as const;
