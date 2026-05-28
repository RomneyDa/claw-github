(() => {
  const VISIBLE_COMMAND_COUNT = 5;
  const LRU_STORAGE_KEY = "clawGithubCommandLru";
  const BUTTON_CLASS = "claw-github-command-button";
  const FEATURE_ROW_CLASS = "claw-github-feature-row";
  const COMMANDS_CLASS = "claw-github-command-list";
  const TOP_ROW_ID = "claw-github-top-feature-row";
  const BOTTOM_ROW_ID = "claw-github-bottom-feature-row";
  let lruCommandIds = [];
  const COMMANDS = [
    {
      id: "rereview",
      label: "Re-review",
      comment: "@clawsweeper re-review"
    },
    {
      id: "status",
      label: "Status",
      comment: "@clawsweeper status"
    },
    {
      id: "automerge",
      label: "Automerge",
      comment: "@clawsweeper automerge"
    },
    {
      id: "autofix",
      label: "Autofix",
      comment: "@clawsweeper autofix"
    },
    {
      id: "fix-ci",
      label: "Fix CI",
      comment: "@clawsweeper fix ci"
    },
    {
      id: "address-review",
      label: "Address review",
      comment: "@clawsweeper address review"
    },
    {
      id: "rebase",
      label: "Rebase",
      comment: "@clawsweeper rebase"
    },
    {
      id: "explain",
      label: "Explain",
      comment: "@clawsweeper explain"
    },
    {
      id: "stop",
      label: "Stop",
      comment: "@clawsweeper stop"
    },
    {
      id: "approve",
      label: "Approve",
      comment: "@clawsweeper approve"
    },
    {
      id: "hatch",
      label: "Hatch",
      comment: "@clawsweeper hatch"
    },
    {
      id: "visualize",
      label: "Visualize",
      comment: "@clawsweeper visualize state"
    },
    {
      id: "mantis-telegram",
      label: "Mantis Telegram",
      comment: "@openclaw-mantis telegram"
    },
    {
      id: "mantis-visible-proof",
      label: "Mantis proof",
      comment: "@openclaw-mantis telegram visible proof"
    },
    {
      id: "mantis-discord-status",
      label: "Mantis Discord status",
      comment: "@openclaw-mantis discord status reaction"
    },
    {
      id: "mantis-discord-thread",
      label: "Mantis Discord thread",
      comment: "@openclaw-mantis discord thread attachment"
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
    button.textContent = command.label;
    button.title = command.comment;
    button.addEventListener("click", () => useCommand(command.id));
    return button;
  }

  function createCommandSelect(commands) {
    const select = document.createElement("select");
    select.className = "claw-github-command-select form-select input-sm";
    select.setAttribute("aria-label", "More Claw GitHub commands");

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "More...";
    select.append(placeholder);

    for (const command of commands) {
      const option = document.createElement("option");
      option.value = command.id;
      option.textContent = command.label;
      option.title = command.comment;
      select.append(option);
    }

    select.addEventListener("change", () => {
      if (!select.value) return;
      useCommand(select.value);
      select.value = "";
    });

    return select;
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

    globalThis.chrome?.storage?.onChanged?.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[LRU_STORAGE_KEY]) return;
      lruCommandIds = normalizeCommandIds(changes[LRU_STORAGE_KEY].newValue);
      refreshCommandRows();
    });
  }

  start();
})();
