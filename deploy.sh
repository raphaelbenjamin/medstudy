#!/usr/bin/env bash
# deploy.sh — one-click push to GitHub Pages
# Usage:  ./deploy.sh              (uses auto commit message)
#         ./deploy.sh "my message" (uses custom commit message)
set -e
cd "$(dirname "$0")"

MSG="${1:-Update site $(date '+%Y-%m-%d %H:%M')}"

echo "📦 Staging all changes..."
git add -A

if git diff --staged --quiet; then
  echo "✅ Nothing to commit — site is already up to date."
  exit 0
fi

echo "💾 Committing: \"$MSG\""
git commit -m "$MSG"

echo "🚀 Pushing to GitHub..."
git push

echo ""
echo "✅ Done! Live at: https://raphaelbenjamin.github.io/medstudy/"
