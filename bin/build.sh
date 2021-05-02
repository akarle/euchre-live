#!/bin/sh
# build.sh -- build the JS bundle pre-deployment
set -e
die() {
    echo "$1" 1>&2
    exit 1
}

build() {
    out="$1"
    shift
    ./node_modules/.bin/esbuild \
        --bundle \
        --loader:.js=jsx \
        "$@" \
        assets/app.js \
        --outfile="public/asset/euchre-live.$out.js"
}

ROOT=$(dirname "$(dirname "$0")")
cd $ROOT || die "unable to cd to $ROOT"

build development
build production --minify

echo ">>> Build Success! <<<"
