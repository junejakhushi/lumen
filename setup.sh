#!/usr/bin/env bash
# One-shot setup: git init, hooks, private GitHub repo, push, verify.
set -e
cd "$(dirname "$0")"
command -v git >/dev/null || { echo "Install git first: https://git-scm.com"; exit 1; }
command -v gh  >/dev/null || { echo "Install GitHub CLI first: https://cli.github.com  (Mac: brew install gh)"; exit 1; }
gh auth status >/dev/null 2>&1 || gh auth login --web -h github.com -p https
[ -d .git ] || git init -b main
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
git add -A
git commit -m "chore: repo skeleton" || true
NAME="${1:-lumen}"
if ! gh repo view "$NAME" >/dev/null 2>&1; then
  gh repo create "$NAME" --private --source=. --push
else
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "$(gh repo view "$NAME" --json url -q .url).git"
  git push -u origin main
fi
echo "--- checks ---"
gh repo view "$NAME" --json url,visibility -q '.url + "  (" + .visibility + ")"'
if git ls-files | grep -iE '(^private/|\.(stl|jcd|glb)$)'; then echo "WARNING: private/CAD files tracked!"; else echo "OK: no private or CAD files tracked"; fi
git check-ignore -q private/stl_in/b_fixture_a.stl && echo "OK: STLs ignored"
git check-ignore -q .forbidden-terms && echo "OK: .forbidden-terms ignored"
echo
echo "Next: add studio/founder/collection names to .forbidden-terms, then run:"
echo "  grep -v '^#' .forbidden-terms | gh secret set FORBIDDEN_TERMS"
