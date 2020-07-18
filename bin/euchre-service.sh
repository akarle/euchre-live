#!/bin/ksh
# OpenBSD rc.d service for euchre.live

# config
INSTALL="/home/_euchre/prod-el"
# end config

daemon="$INSTALL/gloat.pl daemon -m production"
daemon_flags=">> /var/log/gloat/prod.log 2>&1 &"
daemon_user="_euchre"

. /etc/rc.d/rc.subr

# use pexp because the redirections in the flags won't show up in pgrep
pexp="perl $daemon"

rc_cmd "$1"
