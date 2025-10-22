import { ICONS } from "./icons.js";
import {
  IndexedDBStorageProvider,
  RemoteAPIStorageProvider,
} from "./StorageProvider.js";
const template = document.createElement("template");
template.innerHTML = `
    <style>
        :host {
            /* MODIFIED: Changed position to absolute to scroll with page */
            position: absolute;
            top: 0;
            left: 0;
            /* Height and width are now set dynamically by JS */
            pointer-events: none;
            z-index: 2147483647;

            --note-bg-yellow: #fffbe6;
            --note-bg-blue: #e7f3ff;
            --note-bg-green: #e3fcef;
            --note-bg-pink: #ffeff7;
            --note-bg-purple: #f3e7ff;
            --note-header-yellow: #ffe7ba;
            --note-header-blue: #cce4ff;
            --note-header-green: #c3f3d7;
            --note-header-pink: #ffd6ec;
            --note-header-purple: #e9d6ff;
            --panel-bg: #ffffff;
            --panel-text: #333;
            --panel-border: #e0e0e0;
            --primary-color: #007aff;
            --danger-color: #ff3b30;
            --shadow-light: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.12);
            --shadow-medium: 0 4px 6px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.1);
            --shadow-heavy: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
        }
        #notes-container {
            position: relative;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        #notes-container.hidden { display: none; }
        /* MODIFIED: Panel remains fixed to the viewport */
        #panel {
            position: fixed;
            top: 50%;
            right: 0;
            transform: translateY(-50%);
            display: flex;
            align-items: center;
            pointer-events: auto;
        }
        #panel-toggle {
            width: 50px;
            height: 50px;
            background-color: var(--panel-bg);
            border: 1px solid var(--panel-border);
            border-right: none;
            border-radius: 8px 0 0 8px;
            box-shadow: var(--shadow-medium);
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        #panel-toggle:hover { background-color: #f8f8f8; }
        #panel-toggle svg {
            width: 24px;
            height: 24px;
            color: var(--panel-text);
            transition: transform 0.3s ease-in-out;
        }
        #panel-content {
            background-color: var(--panel-bg);
            border: 1px solid var(--panel-border);
            border-radius: 8px 0 0 8px;
            box-shadow: var(--shadow-heavy);
            padding: 1rem;
            flex-direction: column;
            gap: 0.75rem;
            transform: translateX(100%);
            transition: transform 0.3s ease-in-out;
            display: none;
        }
        #panel.open #panel-content {
            transform: translateX(0);
            display: flex;
        }
        #panel.open #panel-toggle { border-radius: 0; }
        #panel.open #panel-toggle svg { transform: rotate(180deg); }
        .panel-button {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border: 1px solid var(--panel-border);
            border-radius: 6px;
            background-color: #fff;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s, box-shadow 0.2s;
            white-space: nowrap;
        }
        .panel-button:hover {
            background-color: #f8f9fa;
            box-shadow: var(--shadow-light);
        }
        .panel-button svg { width: 18px; height: 18px; }
        .panel-button.danger {
            color: var(--danger-color);
            border-color: var(--danger-color);
        }
        .panel-button.danger:hover { background-color: #fff5f5; }
        .note {
            position: absolute;
            width: 280px;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            border-radius: 8px;
            box-shadow: var(--shadow-heavy);
            transition: box-shadow 0.2s;
            overflow: hidden;
            pointer-events: auto;
        }
        .note:hover { box-shadow: 0 15px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1); }
        .note-header {
            padding: 8px;
            cursor: grab;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        }
        .note-header:active { cursor: grabbing; }
        .note-header .colors { display: flex; gap: 5px; }
        .note-header .color-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid transparent;
            transition: transform 0.2s, border-color 0.2s;
        }
        .note-header .color-dot.selected {
            border-color: rgba(0,0,0,0.5);
            transform: scale(1.2);
        }
        .note-header .delete-note {
            background: none;
            border: none;
            cursor: pointer;
            padding: 2px;
            opacity: 0.6;
            transition: opacity 0.2s;
        }
        .note-header .delete-note:hover { opacity: 1; }
        .note-header .delete-note svg { width: 18px; height: 18px; color: #333; }
        .note-content-wrapper { flex-grow: 1; display: flex; flex-direction: column; }
        .note-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            padding: 4px 8px;
            border-bottom: 1px solid rgba(0,0,0,0.08);
            align-items: center;
        }
        .toolbar-button, .toolbar-select, .toolbar-color-wrapper {
            background: none;
            border: none;
            border-radius: 4px;
            padding: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .toolbar-button:hover, .toolbar-select:hover { background-color: rgba(0,0,0,0.05); }
        .toolbar-button.active { background-color: rgba(0,0,0,0.1); }
        .toolbar-button svg { width: 16px; height: 16px; }
        .toolbar-select {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            padding: 2px 4px;
            font-size: 12px;
        }
        .toolbar-color-wrapper { padding: 2px; }
        .toolbar-color-input {
            width: 20px;
            height: 20px;
            border: none;
            padding: 0;
            background: none;
            cursor: pointer;
        }
        .note-editor {
            flex-grow: 1;
            padding: 12px;
            font-size: 15px;
            line-height: 1.5;
            outline: none;
            overflow-y: auto;
            text-align: left;
        }
        .note-editor[contenteditable=true]:empty:before{
            content: attr(placeholder);
            pointer-events: none;
            display: block;
            color: #aaa;
        }
        .note[data-color="yellow"] { background-color: var(--note-bg-yellow); }
        .note[data-color="yellow"] .note-header { background-color: var(--note-header-yellow); }
        .note[data-color="blue"] { background-color: var(--note-bg-blue); }
        .note[data-color="blue"] .note-header { background-color: var(--note-header-blue); }
        .note[data-color="green"] { background-color: var(--note-bg-green); }
        .note[data-color="green"] .note-header { background-color: var(--note-header-green); }
        .note[data-color="pink"] { background-color: var(--note-bg-pink); }
        .note[data-color="pink"] .note-header { background-color: var(--note-header-pink); }
        .note[data-color="purple"] { background-color: var(--note-bg-purple); }
        .note[data-color="purple"] .note-header { background-color: var(--note-header-purple); }
        #color-yellow { background-color: var(--note-header-yellow); }
        #color-blue { background-color: var(--note-header-blue); }
        #color-green { background-color: var(--note-header-green); }
        #color-pink { background-color: var(--note-header-pink); }
        #color-purple { background-color: var(--note-header-purple); }
        .modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0,0,0,0.5);
            display: flex; justify-content: center; align-items: center;
            z-index: 1000; pointer-events: auto;
        }
        .modal-content {
            background: white; padding: 2rem; border-radius: 8px;
            box-shadow: var(--shadow-heavy); max-width: 400px; text-align: center;
        }
        .modal-content p { margin: 0 0 1.5rem 0; }
        .modal-buttons { display: flex; justify-content: center; gap: 1rem; }
        .modal-button { padding: 0.5rem 1.5rem; border-radius: 6px; border: 1px solid var(--panel-border); cursor: pointer; }
        .modal-button.confirm { background-color: var(--danger-color); color: white; border-color: var(--danger-color); }
        .modal-button.cancel { background-color: #fff; }
    </style>

    <div id="notes-container"></div>

    <div id="panel">
        <div id="panel-content">
            <button id="btn-create" class="panel-button" title="创建新便签">${ICONS.plus} 创建便签</button>
            <button id="btn-toggle-visibility" class="panel-button" title="切换显示/隐藏所有便签">${ICONS.eye} 隐藏便签</button>
            <button id="btn-clear-page" class="panel-button danger" title="清除当前页面的所有便签">${ICONS.trash} 清除当前页</button>
            <button id="btn-clear-all" class="panel-button danger" title="清除所有页面的所有便签">${ICONS.clear} 清除所有</button>
            <button id="btn-export" class="panel-button" title="导出所有便签为JSON文件">${ICONS.download} 导出</button>
            <button id="btn-import" class="panel-button" title="从JSON文件导入便签">${ICONS.upload} 导入</button>
            <input type="file" id="import-file-input" accept=".json" style="display: none;" />
        </div>
        <div id="panel-toggle" title="打开/关闭控制面板">
            ${ICONS.panel}
        </div>
    </div>
    <div id="modal-container"></div>
`;

class StickyNotes extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.storage = null;
    this.state = {
      notes: [],
      isPanelOpen: false,
      areNotesVisible: true,
      activeDrag: null,
    };
    this.pageUrl = window.location.pathname;

    // 绑定方法以确保 'this' 的正确性
    this.updateHostDimensions = this.updateHostDimensions.bind(this);
    this.onDragMove = this.onDragMove.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
    this.handleLocationChange = this.handleLocationChange.bind(this);
  }

  connectedCallback() {
    // 更新: 初始化存储提供者
    this.initializeStorageProvider();
    this.storage.init().then(() => {
      this.loadNotes();
    });
    this.addEventListeners();

    // 设置初始尺寸并添加监听器
    this.updateHostDimensions();
    window.addEventListener("resize", this.updateHostDimensions);
    window.addEventListener("scroll", this.updateHostDimensions);

    // 新增: 监听SPA路由变化
    this.listenForSPARouteChanges();
  }

  // 新增: 根据HTML属性初始化存储提供者
  initializeStorageProvider() {
    const storageType = this.getAttribute("storage-type") || "indexeddb";

    if (storageType === "remote") {
      const baseUrl = this.getAttribute("api-base-url");
      const authToken = this.getAttribute("api-auth-token");
      if (!baseUrl) {
        console.error("使用远程存储时，必须提供 'api-base-url' 属性!");
        this.storage = new IndexedDBStorageProvider(); // 回退到默认
      } else {
        this.storage = new RemoteAPIStorageProvider(baseUrl, authToken);
      }
    } else {
      this.storage = new IndexedDBStorageProvider();
    }
  }
  disconnectedCallback() {
    // 清理全局监听器以防止内存泄漏
    window.removeEventListener("resize", this.updateHostDimensions);
    window.removeEventListener("scroll", this.updateHostDimensions);

    // 新增: 停止监听SPA路由变化
    this.stopListeningForSPARouteChanges();
  }

  // 新增: 封装SPA路由监听逻辑
  listenForSPARouteChanges() {
    // 监听浏览器前进/后退
    window.addEventListener("popstate", this.handleLocationChange);

    // 封装 pushState 和 replaceState 以捕获路由变化
    this._originalPushState = history.pushState;
    this._originalReplaceState = history.replaceState;

    const dispatchLocationChange = () => {
      // 使用setTimeout确保URL已经更新
      setTimeout(this.handleLocationChange, 0);
    };

    history.pushState = (...args) => {
      this._originalPushState.apply(history, args);
      dispatchLocationChange();
    };

    history.replaceState = (...args) => {
      this._originalReplaceState.apply(history, args);
      dispatchLocationChange();
    };
  }

  // 新增: 恢复原始的 history 方法
  stopListeningForSPARouteChanges() {
    window.removeEventListener("popstate", this.handleLocationChange);
    history.pushState = this._originalPushState;
    history.replaceState = this._originalReplaceState;
  }

  // 新增: 处理URL变化的核心函数
  async handleLocationChange() {
    if (this.pageUrl !== window.location.pathname) {
      console.log(
        `[StickyNotes] 路由变化: 从 ${this.pageUrl} 到 ${window.location.pathname}`,
      );
      this.pageUrl = window.location.pathname;
      await this.loadNotes();
    }
  }

  updateHostDimensions() {
    this.style.height = `${document.documentElement.scrollHeight}px`;
    this.style.width = `${document.documentElement.scrollWidth}px`;
  }

  addEventListeners() {
    const shadow = this.shadowRoot;
    shadow
      .querySelector("#panel-toggle")
      .addEventListener("click", () => this.togglePanel());
    shadow
      .querySelector("#btn-create")
      .addEventListener("click", () => this.createNote());
    shadow
      .querySelector("#btn-toggle-visibility")
      .addEventListener("click", () => this.toggleNotesVisibility());
    shadow
      .querySelector("#btn-clear-page")
      .addEventListener("click", () => this.confirmClearPage());
    shadow
      .querySelector("#btn-clear-all")
      .addEventListener("click", () => this.confirmClearAll());
    shadow
      .querySelector("#btn-export")
      .addEventListener("click", () => this.exportData());
    shadow
      .querySelector("#btn-import")
      .addEventListener("click", () =>
        shadow.querySelector("#import-file-input").click(),
      );
    shadow
      .querySelector("#import-file-input")
      .addEventListener("change", (e) => this.importData(e));
  }

  render() {
    const container = this.shadowRoot.querySelector("#notes-container");
    container.innerHTML = "";
    this.state.notes.forEach((noteData) => {
      const noteElement = this.createNoteElement(noteData);
      container.appendChild(noteElement);
    });
  }

  createNoteElement(noteData) {
    const noteEl = document.createElement("div");
    noteEl.className = "note";
    noteEl.dataset.id = noteData.id;
    noteEl.dataset.color = noteData.color;
    noteEl.style.left = `${noteData.x}px`;
    noteEl.style.top = `${noteData.y}px`;

    const colors = ["yellow", "blue", "green", "pink", "purple"];
    const colorDots = colors
      .map(
        (color) => `
            <div class="color-dot ${
              noteData.color === color ? "selected" : ""
            }" id="color-${color}" data-color="${color}"></div>
        `,
      )
      .join("");

    noteEl.innerHTML = `
            <div class="note-header">
                <div class="colors">${colorDots}</div>
                <button class="delete-note" title="删除便签">${ICONS.x}</button>
            </div>
            <div class="note-content-wrapper">
                <div class="note-toolbar">
                    <button class="toolbar-button" data-command="bold" title="加粗">${ICONS.bold}</button>
                    <button class="toolbar-button" data-command="underline" title="下划线">${ICONS.underline}</button>
                    <button class="toolbar-button" data-command="strikeThrough" title="删除线">${ICONS.strikethrough}</button>
                    <button class="toolbar-button" data-command="insertUnorderedList" title="无序列表">${ICONS.list}</button>
                    <button class="toolbar-button" data-command="insertOrderedList" title="有序列表">${ICONS.listOrdered}</button>
                    <select class="toolbar-select" data-command="fontSize" title="字体大小">
                        <option value="1">特小</option>
                        <option value="2">小</option>
                        <option value="3" selected>正常</option>
                        <option value="4">中</option>
                        <option value="5">大</option>
                        <option value="6">特大</option>
                    </select>
                    <div class="toolbar-color-wrapper" title="字体颜色">
                        <input type="color" class="toolbar-color-input" data-command="foreColor" value="#333333">
                    </div>
                </div>
                <div class="note-editor" contenteditable="true" placeholder="写点什么吧...">${noteData.content}</div>
            </div>
        `;

    const header = noteEl.querySelector(".note-header");
    const editor = noteEl.querySelector(".note-editor");

    header.addEventListener("mousedown", this.onDragStart.bind(this));
    noteEl
      .querySelector(".delete-note")
      .addEventListener("click", () => this.confirmDeleteNote(noteData.id));

    noteEl.querySelectorAll(".color-dot").forEach((dot) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        this.changeNoteColor(noteData.id, dot.dataset.color);
      });
    });

    noteEl.querySelectorAll(".toolbar-button").forEach((button) => {
      button.addEventListener("click", () => {
        document.execCommand(button.dataset.command, false, null);
        editor.focus();
        this.updateNoteContent(noteData.id, editor.innerHTML);
      });
    });

    const fontSizeSelect = noteEl.querySelector(
      '.toolbar-select[data-command="fontSize"]',
    );
    fontSizeSelect.addEventListener("change", (e) => {
      document.execCommand("fontSize", false, e.target.value);
      editor.focus();
      this.updateNoteContent(noteData.id, editor.innerHTML);
    });

    const fontColorInput = noteEl.querySelector(
      '.toolbar-color-input[data-command="foreColor"]',
    );
    fontColorInput.addEventListener("input", (e) => {
      document.execCommand("foreColor", false, e.target.value);
      editor.focus();
      this.updateNoteContent(noteData.id, editor.innerHTML);
    });

    let saveTimeout;
    editor.addEventListener("input", () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        this.updateNoteContent(noteData.id, editor.innerHTML);
      }, 500);
    });

    return noteEl;
  }

  togglePanel() {
    this.state.isPanelOpen = !this.state.isPanelOpen;
    this.shadowRoot
      .querySelector("#panel")
      .classList.toggle("open", this.state.isPanelOpen);
  }

  toggleNotesVisibility() {
    this.state.areNotesVisible = !this.state.areNotesVisible;
    const container = this.shadowRoot.querySelector("#notes-container");
    const button = this.shadowRoot.querySelector("#btn-toggle-visibility");
    container.classList.toggle("hidden", !this.state.areNotesVisible);

    if (this.state.areNotesVisible) {
      button.innerHTML = `${ICONS.eye} 隐藏便签`;
      button.title = "切换显示/隐藏所有便签";
    } else {
      button.innerHTML = `${ICONS.eyeOff} 显示便签`;
      button.title = "切换显示/隐藏所有便签";
    }
  }

  async loadNotes() {
    this.state.notes = await this.storage.getNotesForPage(this.pageUrl);
    this.render();
  }

  async createNote() {
    const newNote = {
      id: `note-${Date.now()}`,
      pageUrl: this.pageUrl,
      content: "",
      x: 200 + window.scrollX + (this.state.notes.length % 5) * 20,
      y: 150 + window.scrollY + (this.state.notes.length % 5) * 20,
      color: "yellow",
    };
    await this.storage.saveNote(newNote);
    this.state.notes.push(newNote);
    this.render();
  }

  async updateNoteContent(id, content) {
    const note = this.state.notes.find((n) => n.id === id);
    if (note && note.content !== content) {
      note.content = content;
      await this.storage.saveNote(note);
    }
  }

  async changeNoteColor(id, color) {
    const note = this.state.notes.find((n) => n.id === id);
    if (note && note.color !== color) {
      note.color = color;
      await this.storage.saveNote(note);
      this.render();
    }
  }

  confirmDeleteNote(id) {
    this.showModal("您确定要删除这个便签吗？此操作无法撤销。", async () => {
      await this.storage.deleteNote(id);
      this.state.notes = this.state.notes.filter((n) => n.id !== id);
      this.render();
    });
  }

  confirmClearPage() {
    this.showModal("您确定要清除当前页面的所有便签吗？", async () => {
      await this.storage.clearPageNotes(this.pageUrl);
      this.state.notes = [];
      this.render();
    });
  }

  confirmClearAll() {
    this.showModal(
      "您确定要清除所有站点的所有便签吗？这是一个危险操作！",
      async () => {
        await this.storage.clearAllNotes();
        this.state.notes = [];
        this.render();
      },
    );
  }

  async exportData() {
    const allNotes = await this.storage.getAllNotes();
    const dataStr = JSON.stringify(allNotes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sticky-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error("Invalid format");
        this.showModal(
          "导入数据将覆盖所有现有便签，您确定要继续吗？",
          async () => {
            await this.storage.importData(data);
            await this.loadNotes();
          },
        );
      } catch (err) {
        this.showModal("导入失败！请确保文件是正确的JSON格式。");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  onDragStart(e) {
    if (e.target.closest("button, .colors, select, input")) return;
    e.preventDefault();
    const noteEl = e.target.closest(".note");
    if (!noteEl) return;

    const rect = noteEl.getBoundingClientRect();
    this.state.activeDrag = {
      element: noteEl,
      id: noteEl.dataset.id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    document.addEventListener("mousemove", this.onDragMove);
    document.addEventListener("mouseup", this.onDragEnd, { once: true });
  }

  onDragMove(e) {
    if (!this.state.activeDrag) return;
    e.preventDefault();
    const { element, offsetX, offsetY } = this.state.activeDrag;

    let newX = e.clientX - offsetX + window.scrollX;
    let newY = e.clientY - offsetY + window.scrollY;

    const docWidth = document.documentElement.scrollWidth;
    const docHeight = document.documentElement.scrollHeight;
    newX = Math.max(0, Math.min(newX, docWidth - element.offsetWidth));
    newY = Math.max(0, Math.min(newY, docHeight - element.offsetHeight));

    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  }

  async onDragEnd(e) {
    if (!this.state.activeDrag) return;

    const { id, element } = this.state.activeDrag;
    const note = this.state.notes.find((n) => n.id === id);
    if (note) {
      note.x = parseInt(element.style.left, 10);
      note.y = parseInt(element.style.top, 10);
      await this.storage.saveNote(note);
    }

    document.removeEventListener("mousemove", this.onDragMove);
    this.state.activeDrag = null;
  }

  showModal(message, onConfirm = null) {
    const modalContainer = this.shadowRoot.querySelector("#modal-container");
    modalContainer.innerHTML = "";
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const content = document.createElement("div");
    content.className = "modal-content";
    const buttons = `
            <div class="modal-buttons">
                <button class="modal-button cancel">取消</button>
                ${onConfirm ? '<button class="modal-button confirm">确定</button>' : ""}
            </div>
        `;
    content.innerHTML = `<p>${message}</p>${buttons}`;
    overlay.appendChild(content);
    modalContainer.appendChild(overlay);
    overlay.querySelector(".cancel").addEventListener("click", () => {
      modalContainer.innerHTML = "";
    });
    if (onConfirm) {
      overlay.querySelector(".confirm").addEventListener("click", () => {
        onConfirm();
        modalContainer.innerHTML = "";
      });
    } else {
      overlay.querySelector(".cancel").textContent = "关闭";
    }
  }
}

// 定义自定义元素
customElements.define("sticky-notes", StickyNotes);

// (可选) 导出类，方便在其他模块化项目中使用
export default StickyNotes;
