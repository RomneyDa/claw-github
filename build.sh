#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dist_dir="$root_dir/dist"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cp "$root_dir/manifest.json" "$dist_dir/manifest.json"
cp "$root_dir/content.js" "$dist_dir/content.js"
cp "$root_dir/styles.css" "$dist_dir/styles.css"

echo "$dist_dir"
