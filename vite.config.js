import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      // 组件的入口文件
      entry: resolve(__dirname, "src/StickyNotes.js"),
      // UMD 构建模式下暴露的全局变量名
      name: "StickyNotes",
      // 输出的包文件名
      fileName: "sticky-notes",
    },
  },
});
