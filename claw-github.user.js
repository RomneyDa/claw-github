// ==UserScript==
// @name         ClawGithub
// @namespace    https://github.com/RomneyDa/claw-github
// @version      0.4.1
// @description  Adds OpenClaw PR comment buttons to the GitHub PR interface.
// @match        https://github.com/*/*/pull/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_getResourceURL
// @grant        GM_registerMenuCommand
// @resource     openclawIcon https://raw.githubusercontent.com/RomneyDa/claw-github/main/openclaw.webp
// @downloadURL  https://raw.githubusercontent.com/RomneyDa/claw-github/main/claw-github.user.js
// @updateURL    https://raw.githubusercontent.com/RomneyDa/claw-github/main/claw-github.user.js
// ==/UserScript==

(() => {
  const VISIBLE_COMMAND_COUNT = 3;
  const LRU_STORAGE_KEY = "clawGithubCommandLru";
  const SETTINGS_STORAGE_KEY = "clawGithubSettings";
  const BUTTON_CLASS = "claw-github-command-button";
  const FEATURE_ROW_CLASS = "claw-github-feature-row";
  const FEATURE_CONTENT_CLASS = "claw-github-feature-content";
  const COMMANDS_CLASS = "claw-github-command-list";
  const TOP_ROW_ID = "claw-github-top-feature-row";
  const BOTTOM_ROW_ID = "claw-github-bottom-feature-row";
  const ICON_FALLBACK_URL =
    "https://raw.githubusercontent.com/RomneyDa/claw-github/main/openclaw.webp";
  const CLAWSWEEPER_COMMAND_DOCS =
    "https://github.com/openclaw/clawsweeper/blob/main/src/repair/comment-router-core.ts";
  const MANTIS_COMMAND_DOCS = "https://github.com/openclaw/openclaw/tree/main/.github/workflows";
  let lruCommandIds = [];
  let settings = null;
  const FEATURES = [
    {
      id: "pr-comment-buttons",
      name: "PR comment buttons",
      description: "OpenClaw PR comment shortcuts.",
      defaultEnabled: true,
    },
    {
      id: "copy-pr-context",
      name: "Copy PR context",
      description: "Copy PR number, title, repository, URL, and visible branch refs.",
      defaultEnabled: false,
    },
  ];
  const COMMANDS = [
    {
      id: "rereview",
      comment: "@clawsweeper re-review",
      description: "Requests a fresh ClawSweeper review of this PR. It does not submit or merge.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "status",
      comment: "@clawsweeper status",
      description: "Asks ClawSweeper for the current automation status on this PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "automerge",
      comment: "@clawsweeper automerge",
      description: "Opts this PR into the ClawSweeper review, repair, and automerge loop.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "autofix",
      comment: "@clawsweeper autofix",
      description: "Opts this PR into fix-only ClawSweeper repair. It will not merge the PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "fix-ci",
      comment: "@clawsweeper fix ci",
      description: "Asks ClawSweeper to repair failing CI or check failures for this PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "address-review",
      comment: "@clawsweeper address review",
      description: "Asks ClawSweeper to address review feedback on this PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "rebase",
      comment: "@clawsweeper rebase",
      description: "Asks ClawSweeper to update or rebase this PR branch.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "explain",
      comment: "@clawsweeper explain",
      description: "Asks ClawSweeper for read-only context about the current PR state.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "stop",
      comment: "@clawsweeper stop",
      description: "Pauses ClawSweeper automation and leaves this PR for human review.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "approve",
      comment: "@clawsweeper approve",
      description: "Maintainer approval for ClawSweeper automerge when remaining gates allow it.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "hatch",
      comment: "@clawsweeper hatch",
      description: "Requests the ClawSweeper PR egg hatch/comment sync flow for this PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "visualize",
      comment: "@clawsweeper visualize state",
      description: "Queues a read-only visual/state brief for this PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS,
    },
    {
      id: "mantis-telegram",
      comment: "@openclaw-mantis telegram",
      description: "Runs the maintainer-only Mantis Telegram live QA workflow for this PR.",
      docs: MANTIS_COMMAND_DOCS,
    },
    {
      id: "mantis-visible-proof",
      comment: "@openclaw-mantis telegram visible proof",
      description: "Runs the maintainer-only Mantis Telegram desktop visible-proof workflow.",
      docs: MANTIS_COMMAND_DOCS,
    },
    {
      id: "mantis-discord-status",
      comment: "@openclaw-mantis discord status reaction",
      description: "Runs the maintainer-only Mantis Discord status reaction proof workflow.",
      docs: MANTIS_COMMAND_DOCS,
    },
    {
      id: "mantis-discord-thread",
      comment: "@openclaw-mantis discord thread attachment",
      description: "Runs the maintainer-only Mantis Discord thread attachment proof workflow.",
      docs: MANTIS_COMMAND_DOCS,
    },
  ];

  const STYLES = `
    .claw-github-feature-row {
      align-items: center;
      display: inline-flex;
      gap: 6px;
      margin-right: 8px;
      vertical-align: middle;
    }

    .claw-github-settings-shell {
      display: inline-flex;
      position: relative;
    }

    .claw-github-icon-button {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      height: 28px;
      justify-content: center;
      padding: 2px;
      width: 28px;
    }

    .claw-github-icon-button:hover,
    .claw-github-icon-button:focus {
      background: var(--control-transparent-bgColor-hover, var(--color-action-list-item-default-hover-bg, rgba(208, 215, 222, 0.32)));
      outline: none;
    }

    .claw-github-feature-icon {
      height: 24px;
      border-radius: 6px;
      display: block;
      object-fit: contain;
      width: 24px;
    }

    .claw-github-feature-content {
      align-items: center;
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .claw-github-command-list {
      align-items: center;
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .claw-github-command-button {
      white-space: nowrap;
    }

    .claw-github-command-menu {
      position: relative;
    }

    .claw-github-command-menu-summary {
      display: inline-flex;
      list-style: none;
      white-space: nowrap;
    }

    .claw-github-command-menu-summary::-webkit-details-marker {
      display: none;
    }

    .claw-github-command-menu-items {
      background: var(--bgColor-default, var(--color-canvas-default, #ffffff));
      border: 1px solid var(--borderColor-default, var(--color-border-default, #d0d7de));
      border-radius: 6px;
      box-shadow: var(--shadow-floating-small, 0 8px 24px rgba(140, 149, 159, 0.2));
      display: grid;
      gap: 2px;
      min-width: 260px;
      padding: 4px;
      position: absolute;
      right: 0;
      top: calc(100% + 4px);
      z-index: 100;
    }

    .claw-github-command-menu-item {
      background: transparent;
      border: 0;
      border-radius: 4px;
      color: var(--fgColor-default, var(--color-fg-default, #1f2328));
      cursor: pointer;
      font: inherit;
      padding: 6px 8px;
      text-align: left;
      white-space: nowrap;
    }

    .claw-github-command-menu-item:hover,
    .claw-github-command-menu-item:focus {
      background: var(--control-transparent-bgColor-hover, var(--color-action-list-item-default-hover-bg, rgba(208, 215, 222, 0.32)));
      outline: none;
    }

    .claw-github-settings-panel {
      background: var(--bgColor-default, var(--color-canvas-default, #ffffff));
      border: 1px solid var(--borderColor-default, var(--color-border-default, #d0d7de));
      border-radius: 6px;
      box-shadow: var(--shadow-floating-small, 0 8px 24px rgba(140, 149, 159, 0.2));
      color: var(--fgColor-default, var(--color-fg-default, #1f2328));
      display: grid;
      gap: 8px;
      left: 0;
      min-width: 280px;
      padding: 10px;
      position: absolute;
      top: calc(100% + 4px);
      z-index: 101;
    }

    .claw-github-settings-panel[hidden] {
      display: none;
    }

    .claw-github-settings-title {
      font-size: 13px;
      font-weight: 600;
    }

    .claw-github-settings-toggle {
      align-items: flex-start;
      cursor: pointer;
      display: grid;
      gap: 8px;
      grid-template-columns: auto 1fr;
    }

    .claw-github-settings-toggle-copy {
      display: grid;
      gap: 2px;
    }

    .claw-github-settings-toggle-name {
      font-size: 12px;
      font-weight: 600;
    }

    .claw-github-settings-toggle-description {
      color: var(--fgColor-muted, var(--color-fg-muted, #656d76));
      font-size: 11px;
      line-height: 1.35;
    }

    .claw-github-bottom-feature-row {
      margin-bottom: 8px;
    }
  `;

  function isPullRequestPage() {
    return /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/|$)/.test(window.location.pathname);
  }

  function injectStyles() {
    if (document.getElementById("claw-github-userscript-styles")) return;
    const style = document.createElement("style");
    style.id = "claw-github-userscript-styles";
    style.textContent = STYLES;
    document.head.append(style);
  }

  function iconUrl() {
    if (typeof GM_getResourceURL === "function") {
      try {
        return GM_getResourceURL("openclawIcon");
      } catch {
        return ICON_FALLBACK_URL;
      }
    }
    return ICON_FALLBACK_URL;
  }

  function createSettingsButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "claw-github-icon-button";
    button.title = "ClawGithub settings";
    button.setAttribute("aria-label", "ClawGithub settings");

    const icon = document.createElement("img");
    icon.className = "claw-github-feature-icon";
    icon.src = iconUrl();
    icon.alt = "";
    button.append(icon);
    button.addEventListener("click", () => {
      const panel = button.parentElement?.querySelector(".claw-github-settings-panel");
      if (!panel) return;
      panel.hidden = !panel.hidden;
      closeCommandMenusExcept();
    });
    return button;
  }

  function createFeatureRow(id) {
    const row = document.createElement("div");
    row.id = id;
    row.className = FEATURE_ROW_CLASS;
    row.append(createSettingsShell(), createFeatureContent());
    return row;
  }

  function createSettingsShell() {
    const shell = document.createElement("div");
    shell.className = "claw-github-settings-shell";
    shell.append(createSettingsButton(), createSettingsPanel());
    return shell;
  }

  function createSettingsPanel() {
    const panel = document.createElement("div");
    panel.className = "claw-github-settings-panel";
    panel.hidden = true;
    panel.addEventListener("click", (event) => event.stopPropagation());
    renderSettingsPanel(panel);
    return panel;
  }

  function renderSettingsPanel(panel) {
    panel.replaceChildren();

    const title = document.createElement("div");
    title.className = "claw-github-settings-title";
    title.textContent = "ClawGithub";
    panel.append(title);

    for (const feature of FEATURES) {
      const label = document.createElement("label");
      label.className = "claw-github-settings-toggle";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = isFeatureEnabled(feature.id);
      input.addEventListener("change", () => {
        setFeatureEnabled(feature.id, input.checked);
      });

      const copy = document.createElement("span");
      copy.className = "claw-github-settings-toggle-copy";

      const name = document.createElement("span");
      name.className = "claw-github-settings-toggle-name";
      name.textContent = feature.name;

      const description = document.createElement("span");
      description.className = "claw-github-settings-toggle-description";
      description.textContent = feature.description;

      copy.append(name, description);
      label.append(input, copy);
      panel.append(label);
    }
  }

  function createFeatureContent() {
    const content = document.createElement("div");
    content.className = FEATURE_CONTENT_CLASS;
    renderFeatureContent(content);
    return content;
  }

  function renderFeatureContent(content) {
    content.replaceChildren();

    if (isFeatureEnabled("pr-comment-buttons")) {
      content.append(createCommandList());
    }

    if (isFeatureEnabled("copy-pr-context")) {
      content.append(createCopyPrContextButton());
    }
  }

  function createCommandList() {
    const list = document.createElement("div");
    list.className = COMMANDS_CLASS;
    renderCommandList(list);
    return list;
  }

  function renderCommandList(list) {
    list.replaceChildren();

    const orderedCommands = orderedCommandList();
    const visibleCommands = orderedCommands.slice(0, VISIBLE_COMMAND_COUNT);
    const remainingCommands = orderedCommands.slice(VISIBLE_COMMAND_COUNT);

    for (const command of visibleCommands) {
      list.append(createButton(command));
    }

    if (remainingCommands.length > 0) {
      list.append(createCommandSelect(remainingCommands));
    }
  }

  function createButton(command) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS} btn btn-sm`;
    button.textContent = command.comment;
    button.title = commandTooltip(command);
    button.addEventListener("click", () => useCommand(command.id));
    return button;
  }

  function createCommandSelect(commands) {
    const details = document.createElement("details");
    details.className = "claw-github-command-menu";
    details.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      details.open = false;
      summary.focus();
    });

    const summary = document.createElement("summary");
    summary.className = "claw-github-command-menu-summary btn btn-sm";
    summary.textContent = "More...";
    summary.title = "Show remaining ClawGithub commands";
    details.append(summary);

    const menu = document.createElement("div");
    menu.className = "claw-github-command-menu-items";

    for (const command of commands) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "claw-github-command-menu-item";
      item.textContent = command.comment;
      item.title = commandTooltip(command);
      item.addEventListener("click", () => {
        details.open = false;
        useCommand(command.id);
      });
      menu.append(item);
    }

    details.append(menu);

    return details;
  }

  function commandTooltip(command) {
    return `${command.description}\n\nFills: ${command.comment}\nSource: ${command.docs}`;
  }

  function createCopyPrContextButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS} btn btn-sm`;
    button.textContent = "Copy PR context";
    button.title = "Copies repository, PR number, title, URL, and visible branch refs.";
    button.addEventListener("click", () => copyPrContext());
    return button;
  }

  function copyPrContext() {
    const context = prContextText();
    if (!navigator.clipboard?.writeText) {
      window.prompt("Copy PR context", context);
      return;
    }

    navigator.clipboard.writeText(context).catch(() => {
      window.prompt("Copy PR context", context);
    });
  }

  function prContextText() {
    const match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    const owner = match?.[1] ?? "";
    const repo = match?.[2] ?? "";
    const number = match?.[3] ?? "";
    const title =
      document.querySelector(".js-issue-title")?.textContent?.trim() ||
      document.querySelector("bdi.js-issue-title")?.textContent?.trim() ||
      document.title.replace(/ by .+ · Pull Request #\d+ · GitHub$/, "").trim();
    const branchRefs = Array.from(document.querySelectorAll(".commit-ref"))
      .map((element) => element.textContent?.trim())
      .filter(Boolean)
      .slice(0, 4);

    return [
      `Repository: ${owner}/${repo}`,
      `PR: #${number}`,
      `Title: ${title}`,
      `URL: ${window.location.href}`,
      branchRefs.length > 0 ? `Refs: ${branchRefs.join(" -> ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function injectTopButton() {
    if (document.getElementById(TOP_ROW_ID)) return;

    const headerActions =
      document.querySelector(".gh-header-actions") ||
      document.querySelector("[data-testid='pr-header-actions']") ||
      document.querySelector(".js-issue-title")?.closest(".gh-header")?.querySelector(".gh-header-actions");

    if (!headerActions) return;

    headerActions.prepend(createFeatureRow(TOP_ROW_ID));
  }

  function injectBottomButton() {
    if (document.getElementById(BOTTOM_ROW_ID)) return;

    const commentForm = findNewCommentForm();
    if (!commentForm) return;

    const actions =
      commentForm.querySelector(".form-actions") ||
      commentForm.querySelector(".timeline-comment-actions") ||
      commentForm;

    const row = createFeatureRow(BOTTOM_ROW_ID);
    row.classList.add("claw-github-bottom-feature-row");
    actions.prepend(row);
  }

  function findNewCommentForm() {
    const textarea = findCommentTextarea();
    return textarea?.closest("form") || document.querySelector("form.js-new-comment-form");
  }

  function findCommentTextarea() {
    const candidates = [
      "textarea[name='comment[body]']",
      "textarea#new_comment_field",
      "textarea[aria-label='Comment body']",
      "textarea[placeholder*='Leave a comment']",
    ];

    return candidates
      .map((selector) => document.querySelector(selector))
      .find((textarea) => textarea && !textarea.disabled && textarea.offsetParent !== null);
  }

  function setTextareaValue(textarea, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function useCommand(commandId) {
    const command = COMMANDS.find((candidate) => candidate.id === commandId);
    if (!command) return;

    fillComment(command.comment);
    recordCommandUse(command.id);
    refreshCommandRows();
  }

  function fillComment(commentText) {
    const textarea = findCommentTextarea();

    if (!textarea) {
      window.alert("Could not find the GitHub PR comment box.");
      return;
    }

    textarea.scrollIntoView({ block: "center", behavior: "smooth" });
    textarea.focus();
    setTextareaValue(textarea, commentText);
  }

  function orderedCommandList() {
    const byId = new Map(COMMANDS.map((command) => [command.id, command]));
    const ordered = [];

    for (const id of lruCommandIds) {
      const command = byId.get(id);
      if (!command) continue;
      ordered.push(command);
      byId.delete(id);
    }

    return [...ordered, ...byId.values()];
  }

  function normalizeCommandIds(value) {
    const knownIds = new Set(COMMANDS.map((command) => command.id));
    return Array.isArray(value)
      ? value.filter((id) => typeof id === "string" && knownIds.has(id))
      : [];
  }

  function defaultSettings() {
    return {
      featureEnabled: Object.fromEntries(
        FEATURES.map((feature) => [feature.id, feature.defaultEnabled]),
      ),
    };
  }

  function normalizeSettings(value) {
    const defaults = defaultSettings();
    const input = value && typeof value === "object" ? value : {};
    const featureEnabled = { ...defaults.featureEnabled };
    const inputFeatures =
      input.featureEnabled && typeof input.featureEnabled === "object" ? input.featureEnabled : {};

    for (const feature of FEATURES) {
      if (typeof inputFeatures[feature.id] === "boolean") {
        featureEnabled[feature.id] = inputFeatures[feature.id];
      }
    }

    return { featureEnabled };
  }

  function isFeatureEnabled(featureId) {
    return Boolean((settings ?? defaultSettings()).featureEnabled[featureId]);
  }

  function readLocalStorageLruCommandIds() {
    try {
      const value = JSON.parse(window.localStorage.getItem(LRU_STORAGE_KEY) || "[]");
      return normalizeCommandIds(value);
    } catch {
      return [];
    }
  }

  function readLocalStorageSettings() {
    try {
      return normalizeSettings(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || "null"));
    } catch {
      return normalizeSettings(null);
    }
  }

  async function getStoredCommandIds() {
    if (typeof GM_getValue === "function") {
      return normalizeCommandIds(GM_getValue(LRU_STORAGE_KEY, []));
    }
    if (globalThis.GM?.getValue) {
      return normalizeCommandIds(await globalThis.GM.getValue(LRU_STORAGE_KEY, []));
    }
    return readLocalStorageLruCommandIds();
  }

  async function getStoredSettings() {
    if (typeof GM_getValue === "function") {
      return normalizeSettings(GM_getValue(SETTINGS_STORAGE_KEY, null));
    }
    if (globalThis.GM?.getValue) {
      return normalizeSettings(await globalThis.GM.getValue(SETTINGS_STORAGE_KEY, null));
    }
    return readLocalStorageSettings();
  }

  async function setStoredCommandIds(commandIds) {
    if (typeof GM_setValue === "function") {
      GM_setValue(LRU_STORAGE_KEY, commandIds);
      return;
    }
    if (globalThis.GM?.setValue) {
      await globalThis.GM.setValue(LRU_STORAGE_KEY, commandIds);
      return;
    }
    window.localStorage.setItem(LRU_STORAGE_KEY, JSON.stringify(commandIds));
  }

  async function setStoredSettings(nextSettings) {
    if (typeof GM_setValue === "function") {
      GM_setValue(SETTINGS_STORAGE_KEY, nextSettings);
      return;
    }
    if (globalThis.GM?.setValue) {
      await globalThis.GM.setValue(SETTINGS_STORAGE_KEY, nextSettings);
      return;
    }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
  }

  async function loadCommandOrder() {
    settings = await getStoredSettings();
    lruCommandIds = await getStoredCommandIds();
    if (lruCommandIds.length === 0) {
      lruCommandIds = readLocalStorageLruCommandIds();
      if (lruCommandIds.length > 0) await setStoredCommandIds(lruCommandIds);
    }
  }

  function setFeatureEnabled(featureId, enabled) {
    settings = normalizeSettings(settings);
    settings.featureEnabled[featureId] = Boolean(enabled);
    void setStoredSettings(settings);
    refreshSettingsPanels();
    refreshFeatureRows();
  }

  function recordCommandUse(commandId) {
    lruCommandIds = [commandId, ...lruCommandIds.filter((id) => id !== commandId)].slice(
      0,
      COMMANDS.length,
    );
    void setStoredCommandIds(lruCommandIds);
  }

  function refreshCommandRows() {
    for (const row of document.querySelectorAll(`.${COMMANDS_CLASS}`)) {
      renderCommandList(row);
    }
  }

  function refreshFeatureRows() {
    for (const row of document.querySelectorAll(`.${FEATURE_CONTENT_CLASS}`)) {
      renderFeatureContent(row);
    }
  }

  function refreshSettingsPanels() {
    for (const panel of document.querySelectorAll(".claw-github-settings-panel")) {
      renderSettingsPanel(panel);
    }
  }

  function closeCommandMenusExcept(target) {
    for (const menu of document.querySelectorAll(".claw-github-command-menu[open]")) {
      if (target && menu.contains(target)) continue;
      menu.open = false;
    }
  }

  function closeSettingsPanelsExcept(target) {
    for (const shell of document.querySelectorAll(".claw-github-settings-shell")) {
      if (target && shell.contains(target)) continue;
      const panel = shell.querySelector(".claw-github-settings-panel");
      if (panel) panel.hidden = true;
    }
  }

  function openFirstSettingsPanel() {
    injectButtons();
    const panel = document.querySelector(".claw-github-settings-panel");
    if (panel) panel.hidden = false;
  }

  function injectButtons() {
    if (!isPullRequestPage()) return;

    injectStyles();
    injectTopButton();
    injectBottomButton();
  }

  async function start() {
    await loadCommandOrder();
    injectButtons();

    const observer = new MutationObserver(injectButtons);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    document.addEventListener("turbo:render", injectButtons);
    document.addEventListener("turbo:load", injectButtons);
    document.addEventListener("click", (event) => {
      closeCommandMenusExcept(event.target);
      closeSettingsPanelsExcept(event.target);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeCommandMenusExcept();
      closeSettingsPanelsExcept();
    });

    if (typeof GM_addValueChangeListener === "function") {
      GM_addValueChangeListener(LRU_STORAGE_KEY, (_key, _oldValue, newValue) => {
        lruCommandIds = normalizeCommandIds(newValue);
        refreshCommandRows();
      });
      GM_addValueChangeListener(SETTINGS_STORAGE_KEY, (_key, _oldValue, newValue) => {
        settings = normalizeSettings(newValue);
        refreshSettingsPanels();
        refreshFeatureRows();
      });
    }

    if (typeof GM_registerMenuCommand === "function") {
      GM_registerMenuCommand("Open ClawGithub settings", openFirstSettingsPanel);
    }
  }

  void start();
})();
