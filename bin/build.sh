#!/bin/sh
# build.sh -- build the webpack assets pre-deployment
set -e
die() {
    echo "$1" 1>&2
    exit 1
}

[ -e "gloat.pl" ] || die "Not in root of euchre-live"

export MOJO_WEBPACK_VERBOSE=1
export MOJO_WEBPACK_BUILD=1

echo ">>> Building Development Version"
MOJO_MODE=development ./gloat.pl routes

echo ">>> Building Production Version"
MOJO_MODE=production ./gloat.pl routes

echo ">>> Build Success! <<<"
