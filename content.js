(() => {
  const VISIBLE_COMMAND_COUNT = 3;
  const LRU_STORAGE_KEY = "clawGithubCommandLru";
  const BUTTON_CLASS = "claw-github-command-button";
  const FEATURE_ROW_CLASS = "claw-github-feature-row";
  const COMMANDS_CLASS = "claw-github-command-list";
  const TOP_ROW_ID = "claw-github-top-feature-row";
  const BOTTOM_ROW_ID = "claw-github-bottom-feature-row";
  const CLAWSWEEPER_COMMAND_DOCS =
    "https://github.com/openclaw/clawsweeper/blob/main/src/repair/comment-router-core.ts";
  const MANTIS_COMMAND_DOCS = "https://github.com/openclaw/openclaw/tree/main/.github/workflows";
  let lruCommandIds = [];
  const COMMANDS = [
    {
      id: "rereview",
      comment: "@clawsweeper re-review",
      description: "Requests a fresh ClawSweeper review of this PR. It does not submit or merge.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "status",
      comment: "@clawsweeper status",
      description: "Asks ClawSweeper for the current automation status on this PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "automerge",
      comment: "@clawsweeper automerge",
      description: "Opts this PR into the ClawSweeper review, repair, and automerge loop.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "autofix",
      comment: "@clawsweeper autofix",
      description: "Opts this PR into fix-only ClawSweeper repair. It will not merge the PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "fix-ci",
      comment: "@clawsweeper fix ci",
      description: "Asks ClawSweeper to repair failing CI or check failures for this PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "address-review",
      comment: "@clawsweeper address review",
      description: "Asks ClawSweeper to address review feedback on this PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "rebase",
      comment: "@clawsweeper rebase",
      description: "Asks ClawSweeper to update or rebase this PR branch.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "explain",
      comment: "@clawsweeper explain",
      description: "Asks ClawSweeper for read-only context about the current PR state.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "stop",
      comment: "@clawsweeper stop",
      description: "Pauses ClawSweeper automation and leaves this PR for human review.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "approve",
      comment: "@clawsweeper approve",
      description: "Maintainer approval for ClawSweeper automerge when remaining gates allow it.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "hatch",
      comment: "@clawsweeper hatch",
      description: "Requests the ClawSweeper PR egg hatch/comment sync flow for this PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "visualize",
      comment: "@clawsweeper visualize state",
      description: "Queues a read-only visual/state brief for this PR.",
      docs: CLAWSWEEPER_COMMAND_DOCS
    },
    {
      id: "mantis-telegram",
      comment: "@openclaw-mantis telegram",
      description: "Runs the maintainer-only Mantis Telegram live QA workflow for this PR.",
      docs: MANTIS_COMMAND_DOCS
    },
    {
      id: "mantis-visible-proof",
      comment: "@openclaw-mantis telegram visible proof",
      description: "Runs the maintainer-only Mantis Telegram desktop visible-proof workflow.",
      docs: MANTIS_COMMAND_DOCS
    },
    {
      id: "mantis-discord-status",
      comment: "@openclaw-mantis discord status reaction",
      description: "Runs the maintainer-only Mantis Discord status reaction proof workflow.",
      docs: MANTIS_COMMAND_DOCS
    },
    {
      id: "mantis-discord-thread",
      comment: "@openclaw-mantis discord thread attachment",
      description: "Runs the maintainer-only Mantis Discord thread attachment proof workflow.",
      docs: MANTIS_COMMAND_DOCS
    }
  ];

  function isPullRequestPage() {
    return /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/|$)/.test(window.location.pathname);
  }

  function createLobsterIcon() {
    const icon = document.createElement("img");
    icon.className = "claw-github-feature-icon";
    icon.src = chrome.runtime.getURL("openclaw.webp");
    icon.alt = "";
    icon.setAttribute("aria-label", "Claw GitHub features");
    icon.setAttribute("role", "img");
    return icon;
  }

  function createFeatureRow(id) {
    const row = document.createElement("div");
    row.id = id;
    row.className = FEATURE_ROW_CLASS;
    row.append(createLobsterIcon(), createCommandList());
    return row;
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
    summary.title = "Show remaining Claw GitHub commands";
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
      "textarea[placeholder*='Leave a comment']"
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

  function readLocalStorageLruCommandIds() {
    try {
      const value = JSON.parse(window.localStorage.getItem(LRU_STORAGE_KEY) || "[]");
      return normalizeCommandIds(value);
    } catch {
      return [];
    }
  }

  function loadCommandOrder() {
    return new Promise((resolve) => {
      if (!globalThis.chrome?.storage?.local) {
        lruCommandIds = readLocalStorageLruCommandIds();
        resolve();
        return;
      }

      chrome.storage.local.get([LRU_STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          lruCommandIds = readLocalStorageLruCommandIds();
          resolve();
          return;
        }

        lruCommandIds = normalizeCommandIds(result?.[LRU_STORAGE_KEY]);
        if (lruCommandIds.length === 0) {
          lruCommandIds = readLocalStorageLruCommandIds();
          if (lruCommandIds.length > 0) {
            chrome.storage.local.set({ [LRU_STORAGE_KEY]: lruCommandIds });
          }
        }
        resolve();
      });
    });
  }

  function recordCommandUse(commandId) {
    lruCommandIds = [commandId, ...lruCommandIds.filter((id) => id !== commandId)].slice(
      0,
      COMMANDS.length
    );

    if (globalThis.chrome?.storage?.local) {
      chrome.storage.local.set({ [LRU_STORAGE_KEY]: lruCommandIds });
    } else {
      window.localStorage.setItem(LRU_STORAGE_KEY, JSON.stringify(lruCommandIds));
    }
  }

  function refreshCommandRows() {
    for (const row of document.querySelectorAll(`.${COMMANDS_CLASS}`)) {
      renderCommandList(row);
    }
  }

  function closeCommandMenusExcept(target) {
    for (const menu of document.querySelectorAll(".claw-github-command-menu[open]")) {
      if (target && menu.contains(target)) continue;
      menu.open = false;
    }
  }

  function injectButtons() {
    if (!isPullRequestPage()) return;

    injectTopButton();
    injectBottomButton();
  }

  function start() {
    loadCommandOrder().then(refreshCommandRows);
    injectButtons();

    const observer = new MutationObserver(injectButtons);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    document.addEventListener("turbo:render", injectButtons);
    document.addEventListener("turbo:load", injectButtons);
    document.addEventListener("click", (event) => closeCommandMenusExcept(event.target));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCommandMenusExcept();
    });

    globalThis.chrome?.storage?.onChanged?.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[LRU_STORAGE_KEY]) return;
      lruCommandIds = normalizeCommandIds(changes[LRU_STORAGE_KEY].newValue);
      refreshCommandRows();
    });
  }

  start();
})();
