# ClawGithub

This unpacked Chrome extension runs only on GitHub pull request pages and injects OpenClaw PR comment buttons near the PR header and near the bottom comment form.

Clicking a command enters its exact text into the PR comment box without submitting it. The three most recently used commands are shown as buttons, and the remaining commands continue in LRU order inside the `More...` selector. Hover a command to see what it does and where the command is implemented.

```text
@clawsweeper re-review
```

Click the OpenClaw icon in the injected row to open ClawGithub settings. The PR comment buttons feature is enabled by default. Additional tools are off by default and can be enabled from that panel.

Current optional tools:

- `Copy PR context`: copies repository, PR number, title, URL, and visible branch refs.

## Install Locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder.

The extension only matches URLs like:

```text
https://github.com/<owner>/<repo>/pull/<number>
```

## Install Userscript

For Firefox, Safari, or other browsers, install a userscript manager such as Violentmonkey, Tampermonkey, or Userscripts, then install the release asset:

```text
claw-github.user.js
```

The userscript uses userscript-manager storage for the command LRU when available, with GitHub `localStorage` as a fallback.

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

GitHub Actions builds and uploads both release assets when a version tag is pushed:

- `claw-github-extension.zip`
- `claw-github.user.js`

```sh
git tag v0.1.0
git push origin v0.1.0
```

You can also run the **Release** workflow manually and provide a tag name.
