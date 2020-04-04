# Euchre::Dealer -- the Server API
use strict;
use warnings;

package Euchre::Dealer;

use List::Util;

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
#           players => [ p1, p2, p3, p4 ], # player objs
#           spectators => [ pa, pb, ... ], # for "lobby" period of picking seat
#           tricks =>  [ p1, p2, p3, p4 ], # ints per player
#           dealer => 0-3,
#           turn => 0-3,
#           trump => 0-3,
#           caller => 0-3,
#           table => [ c1, c2, c3, c4 ], # up to 4 cards
#           score => [X, Y],
#           in_progress => 0/1,
#           trump_nominee => 0-23,
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
#           id   => client id (key in %PLAYERS)
#           game => reference to current game object,
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
    $PLAYERS{$id} = { id => $id, ws => $tx };
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
        # Game management endpoints
        join_game   => \&join_game,
        take_seat   => \&take_seat,
        stand_up    => \&stand_up,
        start_game  => \&start_game,
    );

    if (exists $dispatch{$msg->{action}}) {
        $dispatch{$msg->{action}}->($PLAYERS{$cid}, $msg);
    } else {
        die "Unknown API action: $msg->{action}";
    }
}

# player_name
# game_id
sub join_game {
    my ($p, $msg) = @_;

    my $id = $msg->{game_id};

    # init game if needed
    if (!exists $GAMES{$id}) {
        $GAMES{$id} = {
            id => $id,
            players => [undef, undef, undef, undef],
            spectators => [],
            turn => -1,
            dealer => -1,
            trump => -1,
            tricks => [0, 0, 0, 0],
            table => [],
            callers => -1,
            score => [0, 0],
            in_progress => 0,
        };
    }

    # Handle full game case
    if ($GAMES{$id}->{in_progress}) {
        send_error($p, 'Already 4 players');
    } else {
        # Add player object to Game
        # All players start as spectators and have to take a seat explicitly
        $p->{name} = $msg->{player_name};
        $p->{game} = $GAMES{$id};
        push @{$GAMES{$id}->{spectators}}, $p;

        # XXX: for fast prototyping we just broadcast gamestate
        broadcast_gamestate($GAMES{$id});
    }
}

# seat
sub take_seat {
    my ($p, $msg) = @_;

    my $game = $p->{game};
    my $seat = $msg->{seat};

    if (defined $game->{players}->[$seat]) {
        send_error($p, 'Seat is taken');
    } else {
        # Move from standing to sitting
        $game->{players}->[$seat] = $p;
        $p->{seat} = $seat;
        for (my $i = 0; $i < @{$game->{spectators}}; $i++) {
            if ($game->{spectators}->[$i]->{id} eq $p->{id}) {
                splice(@{$game->{spectators}}, $i, 1);
            }
        }
    }
    broadcast_gamestate($game);
}

sub stand_up {
    my ($p) = @_;

    my $game = $p->{game};
    my $seat = $p->{seat};

    if (!defined $seat) {
        send_error($p, 'Already standing!');
    } else {
        # Move from sitting to standing
        push @{$game->{spectators}}, $p;
        $game->{players}->[$seat] = undef;
        broadcast_gamestate($game);
    }

}

sub start_game {
    my ($p) = @_;
    my $game = $p->{game};

    if (num_players($game->{id}) < 4) {
        send_error($p, "Can't start with empty seats!");
    } else {
        $game->{in_progress} = 1;
        # TODO: kick spectators out?
        # TODO: deal!
        broadcast_gamestate($game);
    }
    start_new_round($game);
}

sub num_players {
    my ($gid) = @_;
    return scalar grep { defined } @{$GAMES{$gid}->{players}}
}

sub start_new_round {
    my ($game) = @_;

    # Shift dealer and deal
    $game->{dealer} = ($game->{dealer} + 1 % 4);
    deal_players_hands($game);

    # Signal vote of player next to dealer...
    $game->{turn} = ($game->{dealer} + 1 % 4);
    broadcast_gamestate($game); # includes trump_nominee
}

# Hands need to be sent as private messages. For now, we don't
# keep them in the game state to simplify server logic
sub deal_players_hands {
    my ($game) = @_;

    my ($handsA, $kiddeyA) = deal();
    $game->{trump_nominee} = shift @$kiddeyA;
    for my $p (@{$game->{players}}) {
        my @hand = map { cid_to_name($_) } @{shift @$handsA};
        $p->{ws}->send({ json =>
            {
                msg_type => 'deal',
                hand => \@hand,
            }
        });
    }
}

# XXX: The most simplest (bulkiest) message we can send is to just
# broadcast the gamestate to all clients. This will be our temporary
# debugging method / MVP. We can trim down the communication later
sub broadcast_gamestate {
    my ($game) = @_;

    # Get all players in the game
    my @all_ws = map { $_->{ws} }
                 grep { defined }
                 (@{$game->{players}}, @{$game->{spectators}});

    # Translate to human readable names for clients
    my @pnames = map { defined($_) ? $_->{name} : 'Empty' } @{$game->{players}};
    my @snames = map { $_->{name} } @{$game->{spectators}};
    my $msg = {
        %$game,
        players => \@pnames,
        spectators => \@snames,
    };

    if (exists $game->{trump_nominee}) {
        $msg->{trump_nominee} = cid_to_name($game->{trump_nominee});
    }

    my $json = { msg_type => 'game_state', game => $msg };
    for my $ws (@all_ws) {
        $ws->send({ json => $json});
    }
}


sub send_error {
    my ($p, $msg) = @_;
    my $ws = $p->{ws};
    my $json = { msg_type => 'error', msg => $msg };
    $ws->send({ json => $json});
}

1;
