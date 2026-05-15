#!/bin/sh
# Runs ESLint before every git commit. Abort commit if lint fails.
cd "$(git rev-parse --show-toplevel)" || exit 1
echo "Running lint..."
npm run lint --silent
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo "Lint failed — commit aborted. Fix errors above and try again."
  exit 1
fi
exit 0
