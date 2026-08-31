/* 卡片着色。两层叠加而非单层实色——不透明的色块和旁边半透明的抽屉卡片材质对不上，
   会显得像贴上去的贴纸。品牌色压到 0.7 左右让底下的预模糊壁纸透上来，再叠一层
   左上角的径向高光当光源，卡片才有体积。 */
const HIGHLIGHT =
  "radial-gradient(118% 92% at 0% 0%, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.06) 42%, rgba(255, 255, 255, 0) 62%)";

/* 亮色卡上白色高光是看不见的，换成左上偏白、右下微暗的柔和渐层来做体积 */
const LIGHT_HIGHLIGHT =
  "radial-gradient(120% 95% at 0% 0%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 58%), radial-gradient(90% 80% at 100% 100%, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0) 60%)";

/** 深色材质：高光 + 品牌色渐变 */
export const tint = (...layers) => [HIGHLIGHT, ...layers].join(", ");

/** 浅色材质：柔和渐层 + 品牌色渐变 */
export const lightTint = (...layers) => [LIGHT_HIGHLIGHT, ...layers].join(", ");
