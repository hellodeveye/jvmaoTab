import { theme } from "antd";

/*
 * 中性色只用一套灰系,和各自的背景同源,否则大色块会显出色偏。
 * 浅色:背景是暖灰(workspaceBackdrop #fafaf9 / workspaceSidebar #f3f3f1),
 *      墨色跟着走暖灰 —— 换成冷灰(如 #27272a)时,主按钮那块黑会明显发蓝。
 * 深色:背景是中性灰(#111111 / #181818),墨色就用不带色偏的中性灰。
 */
const APP_COLORS = {
  light: {
    optionSelectedBg: "rgba(28, 25, 23, 0.065)",
    optionActiveBg: "rgba(28, 25, 23, 0.04)",
    optionSelectedColor: "rgba(28, 25, 23, 0.9)",
    primary: "#292524",
    primaryHover: "#44403c",
    primaryActive: "#1c1917",
    primaryText: "#1c1917",
    primaryBorder: "rgba(41, 37, 36, 0.45)",
    primaryHoverBg: "rgba(28, 25, 23, 0.05)",
    primaryActiveBg: "rgba(28, 25, 23, 0.09)",
    defaultColor: "#44403c",
    defaultBorderColor: "rgba(41, 37, 36, 0.18)",
    defaultHoverBg: "rgba(28, 25, 23, 0.04)",
    defaultHoverColor: "#1c1917",
    defaultHoverBorderColor: "rgba(41, 37, 36, 0.3)",
    confirmIconColor: "#78716c",
  },
  dark: {
    optionSelectedBg: "rgba(255, 255, 255, 0.085)",
    optionActiveBg: "rgba(255, 255, 255, 0.055)",
    optionSelectedColor: "rgba(255, 255, 255, 0.88)",
    primary: "#737373",
    primaryHover: "#8a8a8a",
    primaryActive: "#5f5f5f",
    primaryText: "#fafafa",
    primaryBorder: "rgba(229, 229, 229, 0.5)",
    primaryHoverBg: "rgba(255, 255, 255, 0.09)",
    primaryActiveBg: "rgba(255, 255, 255, 0.14)",
    defaultColor: "#e5e5e5",
    defaultBorderColor: "rgba(229, 229, 229, 0.18)",
    defaultHoverBg: "rgba(255, 255, 255, 0.08)",
    defaultHoverColor: "#fafafa",
    defaultHoverBorderColor: "rgba(229, 229, 229, 0.3)",
    confirmIconColor: "#a3a3a3",
  },
};

export const getAppColors = (isDark) => APP_COLORS[isDark ? "dark" : "light"];

export const getAppPrimaryColor = (isDark) => getAppColors(isDark).primary;

/** 全局 Ant Design 主题：所有按钮和交互控件共用同一套中性色。 */
export const getAppTheme = (isDark) => {
  const colors = getAppColors(isDark);

  return {
    cssVar: true,
    algorithm: isDark ? theme.darkAlgorithm : undefined,
    token: {
      colorPrimary: colors.primary,
      colorPrimaryHover: colors.primaryHover,
      colorPrimaryActive: colors.primaryActive,
    },
    components: {
      Button: {
        /* 主按钮不用实底：透明底 + 更重的描边和更深的文字来分主次。
           这三个 colorPrimary* 只在 Button 内生效（组件级 token 覆盖），
           全局 colorPrimary 仍是 colors.primary，焦点环等照旧。
           描边色没有对应 token（solid 变体不设 border-color），
           走 --btnPrimaryBorder，见 Tower 与 app.scss。 */
        colorPrimary: "transparent",
        colorPrimaryHover: colors.primaryHoverBg,
        colorPrimaryActive: colors.primaryActiveBg,
        primaryColor: colors.primaryText,
        primaryShadow: "none",
        defaultBg: "transparent",
        defaultColor: colors.defaultColor,
        defaultBorderColor: colors.defaultBorderColor,
        defaultHoverBg: colors.defaultHoverBg,
        defaultHoverColor: colors.defaultHoverColor,
        defaultHoverBorderColor: colors.defaultHoverBorderColor,
        fontWeight: 500,
      },
      Modal: {
        colorInfo: colors.confirmIconColor,
        colorWarning: colors.confirmIconColor,
      },
      Popconfirm: {
        colorWarning: colors.confirmIconColor,
      },
      Checkbox: {
        /* 勾选态跟主按钮同一套语言：不填实底，深描边 + 深勾。
           antd 里选中态的 background 与 border-color 共用 colorPrimary，
           两者不能只靠 token 拆开，底色在 app.scss 里压成透明。
           colorWhite 是勾本身的颜色（勾是用 border 画的），
           这里的覆盖都只在 Checkbox 内生效。 */
        colorPrimary: colors.primaryText,
        colorPrimaryHover: colors.primaryHoverBg,
        colorWhite: colors.primaryText,
      },
      Select: {
        optionSelectedBg: colors.optionSelectedBg,
        optionActiveBg: colors.optionActiveBg,
        optionSelectedColor: colors.optionSelectedColor,
        optionSelectedFontWeight: 500,
      },
    },
  };
};
