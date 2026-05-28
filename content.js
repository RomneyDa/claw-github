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
    const icon = document.createElement("span");
    icon.className = "claw-github-feature-icon";
    icon.setAttribute("aria-label", "Claw GitHub features");
    icon.setAttribute("role", "img");
    icon.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7.2 8.6c-1.1-.3-2.2-1-2.9-2L3 4.9l1.6-1.2 1.2 1.6c.5.7 1.4 1.1 2.2 1.2l.5-2.2 2 .5-.8 3.3c.7.5 1.2 1.2 1.5 2h1.6c.3-.8.8-1.5 1.5-2l-.8-3.3 2-.5.5 2.2c.9-.1 1.7-.5 2.2-1.2L19.4 3.7 21 4.9l-1.3 1.7c-.7 1-1.8 1.7-2.9 2 .8 1 .9 2.5.1 3.7l-.6.9-1.7-1.1.6-.9c.5-.7.3-1.7-.4-2.2-.7.8-1.7 1.3-2.8 1.3s-2.1-.5-2.8-1.3c-.7.5-.9 1.5-.4 2.2l.6.9-1.7 1.1-.6-.9c-.8-1.2-.7-2.7.1-3.7Z" />
        <path d="M8 13.8h8v2.1c0 2.2-1.8 4.1-4 4.1s-4-1.9-4-4.1v-2.1Z" />
        <path d="M5.1 15.3 2.8 14l-1 1.7 3.7 2.1L8 16.4v-2.3l-2.9 1.2Z" />
        <path d="m18.9 15.3 2.3-1.3 1 1.7-3.7 2.1-2.5-1.4v-2.3l2.9 1.2Z" />
      </svg>
    `;
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
