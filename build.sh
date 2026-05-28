#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dist_dir="$root_dir/dist"
package_name="claw-github-extension.zip"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$root_dir"
zip -r "$dist_dir/$package_name" \
  manifest.json \
  content.js \
  styles.css \
  README.md

echo "$dist_dir/$package_name"
