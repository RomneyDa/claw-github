# Clawsweeper Re-review Chrome Extension

This unpacked Chrome extension runs only on GitHub pull request pages and injects a `Clawsweeper re-review` button near the PR header and near the bottom comment form.

Clicking the button posts this PR comment:

```text
@clawsweeper re-review
```

## Install Locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder.

The extension only matches URLs like:

```text
https://github.com/<owner>/<repo>/pull/<number>
```
