# Euchre::Dealer -- the Server API
use strict;
use warnings;

package Euchre::Dealer;

use List::Util;
use Mojo::JSON qw(encode_json);

use Euchre::Card;
use Euchre::Game;

require Exporter;
our @ISA = qw(Exporter);
our @EXPORT = qw(
    handle_msg
    register_player
    gloaters_never_win
);

# XXX: The first draft of this was written quickly and chose
# to use global hashes over objects. I think globals are eventually
# necessary, becuase the server needs it all in memory. It's just
# unfortunate... (or common wisdom tells me so)
#
# Nevertheless here's the rough idea:
#
#   %GAMES -- each game is a hash with
#       {
#           players => [ p1, p2, p3, p4 ], # ws ids in %PLAYERS
#           tricks =>  [ p1, p2, p3, p4 ], # ints per player
#           dealer => 0-3,
#           turn => 0-3,
#           trump => 0-3,
#           callers => 0-3, # player XXX
#           table => [ c1, c2, c3, c4 ], # up to 4 cards
#           score => [X, Y],
#       }
#
#   We decided the players would keep track of their own hands
#   (after the initial deal), which simplifies state
#
#
#   %PLAYERS -- all active players (across all games), keyed on client
#   websocket id
#
#       {
#           game_id => key in %GAMES,
#           name => username,
#           seat => 0-3,
#           ws   => websocket obj
#       }
#
#   The players keyed on ws id is key (pun) because the closure in
#   the webserver will always pass the proper client ws id to the
#   handler, allowing us to identify who is playing cards and what
#   game to attribute the action to.

our %GAMES;
our %PLAYERS;

# On ws connection, we add the player to %PLAYERS so that all
# future handle_msg's know how to send messages back to the
# player. No name or game_id known (yet). Player in lobby
sub register_player {
    my ($tx) = @_;
    my $id = ''.$tx;
    $PLAYERS{$id} = { ws => $tx };
    print "Player $id has joined the server\n";
    if ($ENV{DEBUG}) {
        use Data::Dumper;
        print Dumper(\%PLAYERS);
        print Dumper(\%GAMES);
    }
}

# finish handler to cleanup state
sub gloaters_never_win {
    my ($id) = @_;
    if (!exists $PLAYERS{$id}) {
        warn "gloaters_never_win called on unknown player\n";
    }
    # TODO: handle the game cleanup...? should we quit game? pause?
    delete $PLAYERS{$id};
}

# Top level handler to dispatch into the appropriate message.
# Takes in the client ws id and the JSON msg and runs the
# appropriate handler, which is responsible for responding via ws
sub handle_msg {
    my ($cid, $msg) = @_;

    my %dispatch = (
        join_game   => \&join_game,
    );

    if (exists $dispatch{$msg->{action}}) {
        $dispatch{$msg->{action}}->($cid, $msg);
    } else {
        die "Unknown API action: $msg->{action}";
    }
}

# player_name
# game_id
sub join_game {
    my ($cid, $msg) = @_;

    my $id = $msg->{game_id};

    # init game if needed
    if (!exists $GAMES{$id}) {
        $GAMES{$id} = {
            players => [],
            turn => -1,
            dealer => -1,
            trump => -1,
            tricks => [0, 0, 0, 0],
            table => [],
            callers => -1,
            score => [0, 0],
        };
    }

    # Handle full game case
    my $numPlayers = scalar @{$GAMES{$id}->{players}};
    if ($numPlayers >= 4) {
        send_error($cid, { msg => 'Already 4 players' });
    }

    # Add player to Game and cross-link in %PLAYERS for handle_msg
    $PLAYERS{$cid}->{name} = $msg->{player_name};
    $PLAYERS{$cid}->{seat} = $numPlayers; # no +1, idx by 0;
    push @{$GAMES{$id}->{players}}, $cid;

    # XXX: for fast prototyping we just broadcast gamestate
    broadcast_gamestate($GAMES{$id});
}


# XXX: The most simplest (bulkiest) message we can send is to just
# broadcast the gamestate to all clients. This will be our temporary
# debugging method / MVP. We can trim down the communication later
sub broadcast_gamestate {
    my ($game) = @_;

    # Get all players in the game
    my @all_ws = map { $PLAYERS{$_}->{ws} } @{$game->{players}};

    my $json = encode_json({ msg_type => 'game_state', game => $game });
    for my $ws (@all_ws) {
        $ws->send({ json => $json});
    }
}


sub send_error {
    my ($cid, $msg) = @_;
    my $ws = $PLAYERS{$cid}->{ws};
    $msg->{msg_type} = 'error';
    $ws->send({ json => encode_json($msg) });
}

1;
