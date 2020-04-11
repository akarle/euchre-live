# Euchre::Dealer -- the Server API
use strict;
use warnings;

package Euchre::Dealer;

use List::Util qw(sum);

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
#           trump => suit,
#           led   => suit,
#           caller => 0-3,
#           table => [ c1, c2, c3, c4 ], # exactly 4, undef if not played
#           score => [X, Y],
#           phase => 'lobby', 'play', 'vote', 'end'
#           trump_nominee => card,
#           pass_count => 0-7,
#           out_player => -1-3, -1 if none, else idx of "out player"
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
#           ws   => websocket obj,
#           hand => cards in hand,
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

    # Crazy magic dispatch of
    #
    #   action => [ handler, req-phase, phase-err, needs-turn ]
    #
    # The last three are optional, but are useful to dedupe common
    # assertions (like, needs to be their turn)
    my %dispatch = (
        # Game management endpoints
        ping        => [\&pong],
        join_game   => [\&join_game],
        take_seat   => [\&take_seat, 'lobby', "Can't change seats during game"],
        stand_up    => [\&stand_up, 'lobby', "Can't change seats during game"],
        start_game  => [\&start_game, 'lobby', "Game already started"],

        # Gameplay
        order       => [\&order, 'vote', "Not time for a vote", 1],
        play_card   => [\&play_card, 'play', "Can't play cards yet", 1],
    );


    if (!exists $dispatch{$msg->{action}}) {
        die "Unknown API action: $msg->{action}";
    }

    my $p = $PLAYERS{$cid};
    my ($handler, $req_phase, $phase_err, $turn_based) = @{$dispatch{$msg->{action}}};
    if ($req_phase && ($p->{game}->{phase} ne $req_phase)) {
        send_error($p, $phase_err);
    } elsif ($turn_based && ($p->{seat} != $p->{game}->{turn})) {
        send_error($p, "Not your turn!");
    } else {
        $handler->($p, $msg);
    }
}

sub pong {
    my ($p) = @_;
    $p->{ws}->send({ json => { msg_type => 'pong' } });
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
            table => [undef, undef, undef, undef],
            caller => -1,
            score => [0, 0],
            phase => 'lobby',
        };
    }

    # Handle full game case
    if ($GAMES{$id}->{phase} ne 'lobby') {
        send_error($p, 'Game already in progress');
    } else {
        my $game = $GAMES{$id};

        # Make sure name is unique to game
        my @all_names = map { $_->{name} }
                        grep { defined }
                        (@{$game->{players}}, @{$game->{spectators}});

        if (grep { $_ eq $msg->{player_name} } @all_names) {
            send_error($p, 'Username not unique');
            return;
        }

        # Add player object to Game
        # All players start as spectators and have to take a seat explicitly
        $p->{name} = $msg->{player_name};
        $p->{hand} = [];
        $p->{game} = $game;
        push @{$game->{spectators}}, $p;

        broadcast_gamestate($game);
    }
}

# seat
sub take_seat {
    my ($p, $msg) = @_;

    my $game = $p->{game};
    my $seat = $msg->{seat};

    if ($seat > 3 || $seat < 0) {
        send_error($p, 'Invalid seat');
        return;
    }

    if (defined $game->{players}->[$seat]) {
        send_error($p, 'Seat is taken');
        return;
    } else {
        # Move from standing (or sitting) to sitting
        stand_up($p) if defined $p->{seat};
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
        delete $p->{seat};
        $game->{players}->[$seat] = undef;
        broadcast_gamestate($game);
    }

}

sub start_game {
    my ($p) = @_;
    my $game = $p->{game};

    if (num_players($game->{id}) < 4) {
        send_error($p, "Can't start with empty seats!");
        return;
    }

    # TODO: kick spectators out?
    # TODO: deal!
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
    $game->{table} = [undef, undef, undef, undef];
    $game->{tricks} = [0,0,0,0];
    $game->{out_player} = -1;
    deal_players_hands($game);


    # Signal vote of player next to dealer...
    reset_turn($game);
    $game->{phase} = 'vote';
    $game->{pass_count} = 0;
    broadcast_gamestate($game); # includes trump_nominee
}

# Deal the hands, leave the messaging to broadcast
sub deal_players_hands {
    my ($game) = @_;

    my ($handsA, $kiddeyA) = deal();
    $game->{trump_nominee} = shift @$kiddeyA;
    for my $p (@{$game->{players}}) {
        $p->{hand} = shift @$handsA;
    }
}


# msg.vote  = 'suit' or 'pass'
# msg.loner = 0 or 1
sub order {
    my ($p, $msg) = @_;

    my $game = $p->{game};
    if ($msg->{vote} eq 'pass') {
        next_turn($game);
        $game->{pass_count}++;
        if ($game->{pass_count} >= 8) {
            # Throw em in
            start_new_round($game);
        } else {
            broadcast_gamestate($game);
        }
    } elsif ($msg->{vote}) {
        # TODO: add hand/suit validation?
        $game->{trump} = $msg->{vote};
        $game->{caller} = $p->{seat};
        $game->{phase} = 'play';
        if ($msg->{loner}) {
            my $partner_seat = ($p->{seat} + 2) % 4;
            $game->{out_player} = $partner_seat;
            $game->{tricks}->[$partner_seat] = 'X';
        }
        reset_turn($game);
        broadcast_gamestate($game);
    } else {
        send_error($p, "Bad vote");
    }
}

# msg.card => 'AH'
sub play_card {
    my ($p, $msg) = @_;

    # Identify player
    my $game = $p->{game};
    my $seat = $p->{seat};

    # Validate they follow suit if they CAN
    if (defined $game->{led}) {
        my %colors = (H => 'D', D => 'H', S => 'C', C => 'S');

        # Build up a list of valid cards
        my @followers = map { "$_$game->{led}" } qw(N T Q K A); # no jack
        if ($game->{led} eq $game->{trump}) {
            # Trump led, both jacks valid
            push @followers, "J$game->{led}";
            push @followers, "J$colors{$game->{led}}";
        } elsif ($colors{$game->{led}} ne $game->{trump}) {
            # Off-color, jack is OK
            push @followers, "J$game->{led}";
        } else {
            # Played same color as trump, don't add jack
        }
        my $follower_re = join("|", @followers);

        # Now validate that they are EITHER:
        #   1) Following Suit
        #   2) Can't follow suit
        # By checking negative of both
        if ($msg->{card} !~ /$follower_re/ &&
            grep { $_ =~ /$follower_re/ } @{$p->{hand}}) {

            send_error($p, "Have to follow suit!");
            return;
        }
    }

    # Make sure they have the card, and update their hand
    my $found = 0;
    for (my $i = 0; $i < scalar @{$p->{hand}}; $i++) {
        if ($p->{hand}->[$i] eq $msg->{card}) {
            splice(@{$p->{hand}}, $i, 1);
            $found = 1;
            last;
        }
    }
    if (!$found) {
        send_error($p, "You don't have that card!");
        return;
    }

    # Update the table and current player
    $game->{table}->[$seat] = $msg->{card};
    next_turn($game);


    my $played_cards = scalar grep { defined } @{$game->{table}};
    if ($played_cards == 1) {
        # First card!
        my ($val, $suit) = split('', $msg->{card});
        $game->{led} = $suit;
    }

    # Adjust num cards on table by if there's an out player
    my $out_adj = ($game->{out_player} >= 0 ? 1 : 0);
    if ($played_cards >= (4 - $out_adj)) {
        # End trick -- update tricks, clear table, and set current player
        my @table = map { defined($_) ? $_ : 'X' } @{$game->{table}};
        my $winner_id = trick_winner($game->{trump}, $game->{led}, @table);

        $game->{tricks}->[$winner_id]++;
        $game->{turn} = $winner_id;
        $game->{table} = [undef, undef, undef, undef];
        $game->{led} = undef;

        my @num_tricks = grep { /^\d+$/ } @{$game->{tricks}};
        if (sum(@num_tricks) >= 5) {
            # End round -- update scores, clear tricks, push dealer
            my ($team_id, $score) = score_round($game->{caller}, @{$game->{tricks}});
            $game->{score}->[$team_id] += $score;

            if ($game->{score}->[$team_id] >= 10) {
                # End game... no need to redeal
                signal_game_end($game);
            } else {
                start_new_round($game);
            }
        }
    }

    broadcast_gamestate($game);
}


sub signal_game_end {
    my ($game) = @_;

    # TODO: send message with winners and end the game
    # (maybe put game no longer in progress?)
    $game->{phase} = 'end';
}


# XXX: The most simplest (bulkiest) message we can send is to just
# broadcast the gamestate to all clients. This will be our temporary
# debugging method / MVP. We can trim down the communication later
sub broadcast_gamestate {
    my ($game) = @_;

    # Translate to human readable names for clients
    my @pnames = map { defined($_) ? $_->{name} : 'Empty' } @{$game->{players}};
    my @snames = map { $_->{name} } @{$game->{spectators}};
    my $msg = {
        %$game,
        players => \@pnames,
        spectators => \@snames,
    };

    for my $p (@{$game->{players}}, @{$game->{spectators}}) {
        next unless defined $p;

        my $json = {
            msg_type => 'game_state',
            game => $msg,
            hand => $p->{hand},
            sit_out => $p->{sit_out},
        };
        $p->{ws}->send({ json => $json });
    }
}


sub send_error {
    my ($p, $msg) = @_;
    my $ws = $p->{ws};
    my $json = { msg_type => 'error', msg => $msg };
    $ws->send({ json => $json});
}

sub next_turn {
    my ($game) = @_;

    my $turn = ($game->{turn} + 1) % 4;
    if ($turn == $game->{out_player}) {
        # It's a loner! Only gonna be one of these...
        $turn = ($turn + 1) % 4;
    }
    $game->{turn} = $turn;
}

sub reset_turn {
    my ($game) = @_;
    $game->{turn} = $game->{dealer};
    next_turn($game);
}

1;
