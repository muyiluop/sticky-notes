/**
 * 定义 StickyNotesApp 组件的类，供 TypeScript 项目使用。
 * 如果您有希望外部调用的公共方法，可以在这里声明它们的类型。
 */
export class StickyNotesApp extends HTMLElement {
  /**
   * 示例：如果你有一个公共方法来创建便签
   * createNote(): Promise<void>;
   */
}

/**
 * 扩展全局的 HTMLElementTagNameMap 接口。
 * 这使得 TypeScript 能够识别 'sticky-notes-app' 标签，
 * 并在 document.createElement 或 document.querySelector 等方法中提供正确的类型推断。
 */
declare global {
  interface HTMLElementTagNameMap {
    "sticky-notes": StickyNotesApp;
  }
}

export default StickyNotesApp;
