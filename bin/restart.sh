#!/bin/sh
# no more tmux for daemons
# A safe restart script to be run on the server
set -e
die() {
	echo "$1" 1>&2
	exit 1
}

HOST=localhost

restart() {
    name="$1"
    port="$2"
    if pgrep -f "gloat.pl.*$port"; then
            if [ -z "$FORCE" ]; then
                curl -s $HOST:$port/stats | grep -q "0	Players" || die "Players on server"
            fi

            printf "%s" "Killing old server... "
            pkill -f "gloat.pl.*$port"
            sleep 2 # not needed?
            echo "Check!"
    fi

    if [ $name = "preprod" ]; then
        export PREPROD=1
    fi

    printf "%s" "Starting new server... "
    $HOME/${name}-el/gloat.pl daemon -l http://*:$port >> /var/log/gloat/$name.log 2>&1 &
    sleep 2
    echo "Check!"

    curl -s $HOST:$port/stats | grep "Server Start"
}

# Decide which server to restart based on the first arg
case "$1" in
    preprod) restart "preprod" 3001 ;;
    prod) restart "prod" 3000 ;;
    *) die "usage: restart.sh prod|preprod" ;;
esac
