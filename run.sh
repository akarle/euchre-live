#!/bin/sh
# start the app
set -e
die() {
    echo "$1" 1>&2
    exit 1
}

depends() {
    if ! command -v "$1" >/dev/null; then
        die "'$1' not found. See README.md for install instructions"
    fi
}

depends mojo

# Need to move to top-level. Otherwise, the webpack runs a npm install
# each time the server is started...
DIR=`dirname $0`
cd $DIR

if [ -n "$DEBUG" ]; then
    exec ./gloat.pl daemon
else
    exec mojo webpack ./gloat.pl
fi
