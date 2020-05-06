# Euchre::Host -- responsible for all things in the Lobby
# (join/create/leave table actions, registering players, etc)
use strict;
use warnings;

package Euchre::Host;

use Euchre::Errors;
use Euchre::Dealer;
use Euchre::Player;

require Exporter;
our @ISA = qw(Exporter);
our @EXPORT = qw(
    handle_msg
    register_player
    gloaters_never_win
    stats
);

# Global State
our %PLAYERS;
our %DEALERS;
our %PINDEX; # Player id => Dealer id

# Stats
our $TOTAL_PLAYERS = 0;
our $TOTAL_TABLES  = 0;
our $START_TIME = localtime(time);

# On ws connection, we add the player to %PLAYERS so that all future
# handle_msg's know how to send messages back to the player.
sub register_player {
    my ($tx) = @_;
    my $id = ''.$tx;
    $PLAYERS{$id} = Euchre::Player->new(
        id => $id,
        ws => $tx,
    );
    $TOTAL_PLAYERS++;
}

# finish handler to cleanup state
sub gloaters_never_win {
    my ($id) = @_;
    if (!exists $PLAYERS{$id}) {
        warn "gloaters_never_win called on unknown player\n";
        return;
    }

    # TODO: cleanup stale tables
    my $p = $PLAYERS{$id};
    leave_table($p);

    printf "Player %s went inactive\n", $p->name;
    delete $PLAYERS{$id};
}

# Top level handler to dispatch into the appropriate message.
# Takes in the client ws id and the JSON msg and runs the
# appropriate handler, which is responsible for responding via ws
#
# If action not part of dispatch table, assume it is a Dealer action.
# ID the table of the Dealer of the client and dispatch to them
sub handle_msg {
    my ($cid, $msg) = @_;

    my %dispatch = (
        ping         => \&pong,
        join_table   => \&join_table,
        leave_table  => \&leave_table,
        list_tables  => \&list_tables,
    );

    my $p = $PLAYERS{$cid};
    if (!defined $p) {
        # Unknown client -- warn and return
        warn localtime(time) . " Unknown client contacting server\n";
        return;
    }

    if (exists $dispatch{$msg->{action}}) {
        $dispatch{$msg->{action}}->($p, $msg);
    } else {
        require_table($p) or return;
        my $d = $DEALERS{$PINDEX{$p->{id}}};
        $d->handle_msg($cid, $msg);
    }
}


# Checks that client at a table, sends error if not
# Returns 1 if at table, else 0
sub require_table {
    my ($p) = @_;

    my $at_table = exists $PINDEX{$p->{id}};
    if (!$at_table) {
        $p->error(NOT_AT_TABLE);
    }

    return $at_table;
}

sub pong {
    my ($p) = @_;
    $p->send({ msg_type => 'pong' });
}


# player_name
# table
# password (opt)
sub join_table {
    my ($p, $msg) = @_;

    my $tid = $msg->{table};

    $p->name($msg->{player_name});

    # init table if needed
    if (!exists $DEALERS{$tid}) {
        $DEALERS{$tid} = Euchre::Dealer->new(
            id => $tid,
            (exists $msg->{password} ? (password => $msg->{password}) : ()),
        );
        $TOTAL_TABLES++;
    }

    my $d = $DEALERS{$tid};
    if (my $errno = $d->add_player($p, $msg->{password})) {
        $p->error($errno);
    } else {
        $PINDEX{$p->{id}} = $tid;
    }
}

sub leave_table {
    my ($p) = @_;

    require_table($p) or return;

    # Let the dealer do its own cleanup, then cleanup our state
    my $d = $DEALERS{$PINDEX{$p->{id}}};
    if (my $errno = $d->remove_player($p)) {
        $p->error($errno);
    } else {
        delete $PINDEX{$p->{id}};
    }
}

sub list_tables {
    my ($p) = @_;

    # TODO: send more...
    $p->send({
            msg_type => 'list',
            tables => [map { $_->name } values %DEALERS],
        });
}


# Global server stats for games in progress
# Poor man's monitoring :)
sub stats {
    my $num_tables = scalar keys %DEALERS;
    my $num_players = scalar keys %PLAYERS;

    my $msg = "";
    $msg .= "Tables: Start Time\tTable tname\tPlayer name\n";
    $msg .= "===========================================================\n";
    for my $d (values %DEALERS) {
        $msg .= localtime($d->start_time) . "\t" . $d->id . "\n";
        for my $p (values %{$d->players}) {
            $msg .= localtime($p->start_time) . "\t\t" . $p->name . "\n";
        }
    }
    $msg .= "-----------------------------------------------------------\n";
    $msg .= "$num_tables\tTables\n";
    $msg .= "$num_players\tPlayers\n";

    $msg .= "\n\nServer Stats\n";
    $msg .= "===========================================================\n";
    $msg .= "Server Start:     $START_TIME\n";
    $msg .= "Lifetime Tables:  $TOTAL_TABLES\n";
    $msg .= "Lifetime Players: $TOTAL_PLAYERS\n";
    $msg .= "-----------------------------------------------------------\n";
    $msg .= "\n\nUptime: " . `uptime`;

    return $msg;
}

1;
