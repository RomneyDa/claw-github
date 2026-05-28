# Claw GitHub Chrome Extension

This unpacked Chrome extension runs only on GitHub pull request pages and injects Claw GitHub command buttons near the PR header and near the bottom comment form.

Clicking a command enters its exact text into the PR comment box without submitting it. The three most recently used commands are shown as buttons, and the remaining commands continue in LRU order inside the `More...` selector. Hover a command to see what it does and where the command is implemented.

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

## Build

```sh
./build.sh
```

This creates:

```text
dist/
```

`dist/` is the unpacked Chrome extension directory.

## Release

GitHub Actions builds and uploads the extension zip to a GitHub Release when a version tag is pushed:

```sh
git tag v0.1.0
git push origin v0.1.0
```

You can also run the **Release** workflow manually and provide a tag name.
