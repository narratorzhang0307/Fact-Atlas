#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
DEPLOY_HOST=${DEPLOY_HOST:?Set DEPLOY_HOST, for example root@example.com}
DEPLOY_KEY=${DEPLOY_KEY:?Set DEPLOY_KEY to the SSH private key path}
APP_DIR=${APP_DIR:-/root/fact-atlas}
APP_NAME=${APP_NAME:-fact-atlas}
APP_PORT=${APP_PORT:-3013}
SSH=(ssh -i "$DEPLOY_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$DEPLOY_HOST")
RSYNC_SSH="ssh -i $DEPLOY_KEY -o BatchMode=yes -o StrictHostKeyChecking=accept-new"

cd "$ROOT_DIR"
npm run verify

"${SSH[@]}" "install -d -m 750 '$APP_DIR' '$APP_DIR/dist' '$APP_DIR/server' '$APP_DIR/deploy'"
rsync -az --delete -e "$RSYNC_SSH" dist/ "$DEPLOY_HOST:$APP_DIR/dist/"
rsync -az --delete -e "$RSYNC_SSH" server/ "$DEPLOY_HOST:$APP_DIR/server/"
rsync -az -e "$RSYNC_SSH" server.mjs "$DEPLOY_HOST:$APP_DIR/server.mjs"
rsync -az -e "$RSYNC_SSH" deploy/online/ecosystem.config.cjs "$DEPLOY_HOST:$APP_DIR/deploy/ecosystem.config.cjs"

"${SSH[@]}" "set -e; test -s '$APP_DIR/.env'; chmod 600 '$APP_DIR/.env'; cd '$APP_DIR'; if pm2 describe '$APP_NAME' >/dev/null 2>&1; then pm2 reload '$APP_NAME' --update-env; else pm2 start deploy/ecosystem.config.cjs --only '$APP_NAME'; fi; pm2 save >/dev/null; curl -fsS --retry 8 --retry-delay 1 'http://127.0.0.1:$APP_PORT/api/health' >/dev/null"

echo "Fact Atlas deployed and healthy on 127.0.0.1:$APP_PORT."
