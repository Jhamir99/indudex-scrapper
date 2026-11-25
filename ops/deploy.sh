#!/bin/sh
# The operator's deploy (features/012-operations, FR-12): the latest code onto this server. Waits for every job's lock,
# pulls a fast-forward, installs the exact dependencies, builds into dist.next and only then swaps it for dist/, and
# writes the schedule's lines into the crontab (every other line kept). The first install is the same command. The
# steps are src/features/operations/deploy.ts, which Node runs from src/ as it is (it replaces the compiled code).
#   sh ops/deploy.sh
set -e
cd "$(dirname "$0")/.."
exec node src/features/operations/deploy.ts "$@"
