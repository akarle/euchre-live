#!/bin/ksh
# OpenBSD rc.d service for euchre.live

# config
INSTALL="/home/_euchre/prod-el"
# end config

daemon="perl $INSTALL/gloat.pl daemon -m production -l http://127.0.0.1:3000"
daemon_user="_euchre"

. /etc/rc.d/rc.subr

rc_cmd "$1"
