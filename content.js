(() => {
  const COMMENT_TEXT = "@clawsweeper re-review";
  const BUTTON_CLASS = "clawsweeper-rereview-button";
  const FEATURE_ROW_CLASS = "claw-github-feature-row";
  const TOP_ROW_ID = "claw-github-top-feature-row";
  const BOTTOM_ROW_ID = "claw-github-bottom-feature-row";

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
    row.append(createLobsterIcon(), createButton());
    return row;
  }

  function createButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS} btn btn-sm`;
    button.textContent = "Clawsweeper re-review";
    button.addEventListener("click", fillRereviewComment);
    return button;
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

  function fillRereviewComment() {
    const textarea = findCommentTextarea();

    if (!textarea) {
      window.alert("Could not find the GitHub PR comment box.");
      return;
    }

    textarea.scrollIntoView({ block: "center", behavior: "smooth" });
    textarea.focus();
    setTextareaValue(textarea, COMMENT_TEXT);
  }

  function injectButtons() {
    if (!isPullRequestPage()) return;

    injectTopButton();
    injectBottomButton();
  }

  function start() {
    injectButtons();

    const observer = new MutationObserver(injectButtons);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    document.addEventListener("turbo:render", injectButtons);
    document.addEventListener("turbo:load", injectButtons);
  }

  start();
})();
