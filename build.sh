#!/bin/sh
# build.sh -- build webpack assets
set -e
die() {
    echo "$1" 1>&2
    exit 1
}

[ -e "gloat.pl" ] || die "Must be in root of euchre-live"

# Set env vars to force a production build
# export MOJO_MODE=${MOJO_MODE:="production"} # TODO: use in server
export MOJO_WEBPACK_VERBOSE=1
export MOJO_WEBPACK_BUILD=1

# Run an effectively no-op (non daemonizing) command to kick it off
./gloat.pl routes
