(() => {
  const COMMENT_TEXT = "@clawsweeper re-review";
  const BUTTON_CLASS = "clawsweeper-rereview-button";
  const TOP_BUTTON_ID = "clawsweeper-rereview-top-button";
  const BOTTOM_BUTTON_ID = "clawsweeper-rereview-bottom-button";

  function isPullRequestPage() {
    return /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/|$)/.test(window.location.pathname);
  }

  function createButton(id) {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.className = `${BUTTON_CLASS} btn btn-sm`;
    button.textContent = "Clawsweeper re-review";
    button.addEventListener("click", submitRereviewComment);
    return button;
  }

  function injectTopButton() {
    if (document.getElementById(TOP_BUTTON_ID)) return;

    const headerActions =
      document.querySelector(".gh-header-actions") ||
      document.querySelector("[data-testid='pr-header-actions']") ||
      document.querySelector(".js-issue-title")?.closest(".gh-header")?.querySelector(".gh-header-actions");

    if (!headerActions) return;

    headerActions.prepend(createButton(TOP_BUTTON_ID));
  }

  function injectBottomButton() {
    if (document.getElementById(BOTTOM_BUTTON_ID)) return;

    const commentForm = findNewCommentForm();
    if (!commentForm) return;

    const actions =
      commentForm.querySelector(".form-actions") ||
      commentForm.querySelector(".timeline-comment-actions") ||
      commentForm;

    const button = createButton(BOTTOM_BUTTON_ID);
    button.classList.add("clawsweeper-rereview-bottom-button");
    actions.prepend(button);
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

  function findSubmitButton(form) {
    const buttons = Array.from(form.querySelectorAll("button, input[type='submit']"));

    return buttons.find((button) => {
      const label = `${button.textContent || ""} ${button.value || ""} ${button.getAttribute("aria-label") || ""}`.trim();
      return /comment/i.test(label) && !button.disabled && button.offsetParent !== null;
    });
  }

  function clickSubmitWhenReady(form, submitButton, attempts = 20) {
    if (!submitButton.disabled) {
      submitButton.click();
      return;
    }

    if (attempts <= 0) return;

    window.setTimeout(() => clickSubmitWhenReady(form, submitButton, attempts - 1), 100);
  }

  function submitRereviewComment() {
    const textarea = findCommentTextarea();
    const form = textarea?.closest("form");

    if (!textarea || !form) {
      window.alert("Could not find the GitHub PR comment box.");
      return;
    }

    textarea.scrollIntoView({ block: "center", behavior: "smooth" });
    textarea.focus();
    setTextareaValue(textarea, COMMENT_TEXT);

    const submitButton = findSubmitButton(form);
    if (!submitButton) {
      window.alert("Added the re-review text, but could not find the GitHub comment button.");
      return;
    }

    clickSubmitWhenReady(form, submitButton);
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
