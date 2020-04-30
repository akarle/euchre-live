# Euchre::Dealer -- the Server API
use strict;
use warnings;

package Euchre::Dealer;

use Mojo::IOLoop;
use List::Util qw(sum);

use Euchre::Game;

require Exporter;
our @ISA = qw(Exporter);
our @EXPORT = qw(
    handle_msg
    register_player
    gloaters_never_win
    stats
);

# NOTE: Append ONLY for client compatibility
use constant {
    CHANGE_SEAT     => 0,
    STAND_UP        => 1,
    START_GAME      => 2,
    RESTART_GAME    => 3,
    ORDER           => 4,
    DEALER_SWAP     => 5,
    PLAY_CARD       => 6,
    TURN            => 7,
    UNIQUE_USER     => 8,
    INVALID_SEAT    => 9,
    TAKEN_SEAT      => 10,
    ALREADY_STANDING => 11,
    PARTIAL_GAME    => 12,
    VOTE_ON_KITTY   => 13,
    VOTE_OFF_KITTY  => 14,
    BAD_VOTE        => 14,
    FOLLOW_SUIT     => 16,
    DONT_HAVE_CARD  => 17,
    NOT_IN_GAME     => 18,
};

our @ERRORS = ();
$ERRORS[CHANGE_SEAT]     = "Can't change seats during game";
$ERRORS[STAND_UP]        = "Can't change seats during game";
$ERRORS[START_GAME]      = "Game already started";
$ERRORS[RESTART_GAME]    = "Game hasn't ended";
$ERRORS[ORDER]           = "Not time for a vote";
$ERRORS[DEALER_SWAP]     = "Can't swap with Kitty now";
$ERRORS[PLAY_CARD]       = "Can't play cards yet";
$ERRORS[TURN]            = "Not your turn";
$ERRORS[UNIQUE_USER]     = "Username not unique; is this you?";
$ERRORS[INVALID_SEAT]    = "Invalid seat";
$ERRORS[TAKEN_SEAT]      = "Seat is taken";
$ERRORS[ALREADY_STANDING] = "Already standing!";
$ERRORS[PARTIAL_GAME]    = "Can't start with empty seats";
$ERRORS[VOTE_ON_KITTY]   = "Must vote on kitty's suit";
$ERRORS[VOTE_OFF_KITTY]  = "Can't vote for kitty card suit after turned down";
$ERRORS[BAD_VOTE]        = "Bad vote";
$ERRORS[FOLLOW_SUIT]     = "Have to follow suit!";
$ERRORS[DONT_HAVE_CARD]  = "You don't have that card!";
$ERRORS[NOT_IN_GAME]     = "You're not in any game";


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
#           active => is connection active,
#       }
#
#   The players keyed on ws id is key (pun) because the closure in
#   the webserver will always pass the proper client ws id to the
#   handler, allowing us to identify who is playing cards and what
#   game to attribute the action to.

our %GAMES;
our %PLAYERS;

# Stats
our $TOTAL_PLAYERS = 0;
our $TOTAL_GAMES = 0;
our $START_TIME = localtime(time);

# On ws connection, we add the player to %PLAYERS so that all
# future handle_msg's know how to send messages back to the
# player. No name or game_id known (yet). Player in lobby
sub register_player {
    my ($tx) = @_;
    my $id = ''.$tx;
    $PLAYERS{$id} = { id => $id, ws => $tx, active => 1, joined => time };
    print "Player $id has joined the server\n";

    $TOTAL_PLAYERS++;
}

# finish handler to cleanup state
sub gloaters_never_win {
    my ($id) = @_;
    if (!exists $PLAYERS{$id}) {
        warn "gloaters_never_win called on unknown player\n";
        return;
    }
    my $p = $PLAYERS{$id};
    my $game = $p->{game};

    $p->{active} = 0;
    if (defined $game) {
        # Player was in a game... if no one else is still there,
        # we should clean up the game after some inactivity
        my $timeout = $ENV{DEBUG} ? 1 : (60 * 30); # 30 mins
        Mojo::IOLoop->timer($timeout => sub {
            if (!grep { defined($_) && $_->{active} } @{$game->{players}}) {
                print "Deleting inactive Game $game->{id}\n";
                delete $GAMES{$game->{id}};
            }
        });
    }

    my $name = $p->{name} ? $p->{name} : 'UnnamedPlayer';
    print "Player $name went inactive\n";

    # Remove reference in %PLAYERS, but NOTE: still referenced in $game
    # potentially. This is by design. Don't throw away their hand / seat
    # whatever until no active players are at the game and a timeout passes
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
        leave_game  => [\&leave_game],
        take_seat   => [\&take_seat, 'lobby', CHANGE_SEAT],
        stand_up    => [\&stand_up, 'lobby', STAND_UP],
        start_game  => [\&start_game, 'lobby', START_GAME],
        restart_game  => [\&restart_game, 'end', RESTART_GAME],

        # Gameplay
        order       => [\&order, 'vote', ORDER, 1],
        dealer_swap => [\&dealer_swap, 'dealer_swap', DEALER_SWAP, 1],
        play_card   => [\&play_card, 'play', PLAY_CARD, 1],
        chat        => [\&chat],
    );


    if (!exists $dispatch{$msg->{action}}) {
        die "Unknown API action: $msg->{action}";
    }

    my $p = $PLAYERS{$cid};
    my ($handler, $req_phase, $phase_err, $turn_based) = @{$dispatch{$msg->{action}}};
    if ($req_phase && ($p->{game}->{phase} ne $req_phase)) {
        send_error($p, $phase_err);
    } elsif ($turn_based && ($p->{seat} != $p->{game}->{turn})) {
        send_error($p, PLAY_CARD);
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
# force
sub join_game {
    my ($p, $msg) = @_;

    my $id = $msg->{game_id};

    # ckDebug: if env END_DEBUG make score 9-9
    # as in line ~102 above: my $timeout = $ENV{DEBUG} ? 1 : (60 * 30); # 30 mins

    # init game if needed
    if (!exists $GAMES{$id}) {
        $GAMES{$id} = {
            id => $id,
            players => [undef, undef, undef, undef],
            spectators => [],
            turn => -1,
            dealer => -1,
            trump => undef,
            tricks => [0, 0, 0, 0],
            table => [undef, undef, undef, undef],
            caller => -1,
            score => $ENV{END_DEBUG} ? [9,9] :[0, 0],
            phase => 'lobby',
            start_time => time,
        };
        $TOTAL_GAMES++;
    }

    my $game = $GAMES{$id};

    # Make sure name is unique to game
    my @all_names = map { $_->{name} }
                    grep { defined }
                    (@{$game->{players}}, @{$game->{spectators}});

    my $player_exists = grep { $_ eq $msg->{player_name} } @all_names;

    if ($player_exists) {
        if (!$msg->{force}) {
            send_error($p, UNIQUE_USER);
            return;
        }
        $p->{name} = $msg->{player_name};
        swap_player($game, $p, 'players') || swap_player($game, $p, 'spectators');
    } else {
        # Add player object to Game
        # All players start as spectators and have to take a seat explicitly
        $p->{name} = $msg->{player_name};
        $p->{hand} = [];
        $p->{game} = $game;
        push @{$game->{spectators}}, $p;
    }

    broadcast_gamestate($game);
}

sub leave_game {
    my ($p) = @_;

    my $game = $p->{game};
    if (!defined $game) {
        send_error($p, NOT_IN_GAME);
        return;
    }

    delete $p->{game};
    if (exists $p->{seat}) {
        $game->{players}->[$p->{seat}] = undef;
        delete $p->{seat};
        delete $p->{hand};
    } else {
        # Check for specatator
        for (my $i = 0; $i < @{$game->{spectators}}; $i++) {
            if ($game->{spectators}->[$i]->{id} eq $p->{id}) {
                splice(@{$game->{spectators}}, $i, 1);
                last;
            }
        }
    }

    broadcast_gamestate($game); # let others know
}

# seat
sub take_seat {
    my ($p, $msg) = @_;

    my $game = $p->{game};
    my $seat = $msg->{seat};

    if ($seat > 3 || $seat < 0) {
        send_error($p, INVALID_SEAT);
        return;
    }

    if (defined $game->{players}->[$seat]) {
        send_error($p, TAKEN_SEAT);
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
        send_error($p, ALREADY_STANDING);
    } else {
        # Move from sitting to standing
        push @{$game->{spectators}}, $p;
        delete $p->{seat};
        $game->{players}->[$seat] = undef;
        broadcast_gamestate($game);
    }

}

# start_seat: -1 - 3
sub start_game {
    my ($p, $msg) = @_;
    my $game = $p->{game};

    if (num_players($game->{id}) < 4) {
        send_error($p, PARTIAL_GAME);
        return;
    }

    if (!defined $msg->{start_seat} || $msg->{start_seat} < 0) {
        $game->{dealer} = int(rand(4));
    } elsif ($msg->{start_seat} < 4) {
        # One less since start_new_round will rotate
        $game->{dealer} = ($msg->{start_seat} - 1);
    } else {
        send_error($p, INVALID_SEAT);
        return;
    }

    start_new_round($game);
}

sub restart_game {
    my ($p) = @_;
    my $game = $p->{game};

    $game->{score} = $ENV{END_DEBUG} ? [9,9] : [0,0];
    $game->{phase} = 'lobby';
    broadcast_gamestate($game);
}

sub num_players {
    my ($gid) = @_;
    return scalar grep { defined } @{$GAMES{$gid}->{players}}
}

sub start_new_round {
    my ($game) = @_;

    # Shift dealer and deal
    $game->{dealer} = ($game->{dealer} + 1) % 4;
    $game->{trump} = undef;
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

    sort_hands($game);
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
        # Validate its an OK vote
        if ($game->{pass_count} < 4) {
            if ($game->{trump_nominee} !~ /$msg->{vote}/) {
                send_error($p, VOTE_ON_KITTY);
                return;
            }
        } else {
            if ($game->{trump_nominee} =~ /$msg->{vote}/) {
                send_error($p, VOTE_OFF_KITTY);
                return;
            }
        }

        # Accept the vote...
        $game->{trump} = $msg->{vote};
        $game->{caller} = $p->{seat};
        if ($msg->{loner}) {
            my $partner_seat = ($p->{seat} + 2) % 4;
            $game->{out_player} = $partner_seat;
            $game->{tricks}->[$partner_seat] = 'X';
        }
        if ($game->{pass_count} < 4) {
            # Setting phase will block all other play actions until the
            # dealer is done swapping. Do still broadcast so dealer knows!
            # Piggy back on the handle_msg turn validation by temporarily
            # setting "turn" to dealer.
            $game->{phase} = 'dealer_swap';
            $game->{turn} = $game->{dealer};
        } else {
            # Get right to it!
            $game->{phase} = 'play';
            reset_turn($game);
        }

        sort_hands($game);
        broadcast_gamestate($game);
    } else {
        send_error($p, BAD_VOTE);
    }
}

# msg.card => 'AH'
sub play_card {
    my ($p, $msg) = @_;

    # Identify player
    my $game = $p->{game};
    my $seat = $p->{seat};

    my %colors = (H => 'D', D => 'H', S => 'C', C => 'S');

    # Validate they follow suit if they CAN
    if (defined $game->{led}) {

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

            send_error($p, FOLLOW_SUIT);
            return;
        }
    }

    take_card($p, $msg->{card}) or return;

    # Update the table and current player
    $game->{table}->[$seat] = $msg->{card};
    next_turn($game);


    my $played_cards = scalar grep { defined } @{$game->{table}};
    if ($played_cards == 1) {
        # First card!
        my ($val, $suit) = split('', $msg->{card});

        # Special case Jack of Color == trump
        if ($val eq 'J' && $suit eq $colors{$game->{trump}}) {
            $game->{led} = $game->{trump};
        } else {
            $game->{led} = $suit;
        }
    }

    # Adjust num cards on table by if there's an out player
    my $out_adj = ($game->{out_player} >= 0 ? 1 : 0);
    if ($played_cards >= (4 - $out_adj)) {
        # End trick -- update tricks, clear table, and set current player
        my @table = map { defined($_) ? $_ : 'X' } @{$game->{table}};
        my $winner_id = trick_winner($game->{trump}, $game->{led}, @table);

        # Update the gamestate and pause so all can see
        $game->{tricks}->[$winner_id]++;
        $game->{turn} = $winner_id;
        $game->{phase} = 'pause';

        # Sub to call after pause
        my $post_pause = sub {};

        my @num_tricks = grep { /^\d+$/ } @{$game->{tricks}};
        if (sum(@num_tricks) >= 5) {
            # End round -- update scores, clear tricks, push dealer
            my ($team_id, $score) = score_round($game->{caller}, @{$game->{tricks}});
            $game->{score}->[$team_id] += $score;

            if ($game->{score}->[$team_id] >= 10) {
                $post_pause = sub { signal_game_end($game) };
            } else {
                $post_pause = sub { start_new_round($game) };
            }
        }


        Mojo::IOLoop->timer(2 => sub {
            $game->{table} = [undef, undef, undef, undef];
            $game->{led} = undef;
            $game->{phase} = 'play';

            $post_pause->();
            broadcast_gamestate($game);
        });

    }
    broadcast_gamestate($game);
}


sub signal_game_end {
    my ($game) = @_;

    # TODO: send message with winners and end the game
    # (maybe put game no longer in progress?)
    $game->{phase} = 'end';
}


# Based on validation, we KNOW $p is the dealer
# msg.card = card to swap
sub dealer_swap {
    my ($p, $msg) = @_;

    my $game = $p->{game};

    # Exchange the cards
    take_card($p, $msg->{card}) or return;
    push @{$p->{hand}}, $game->{trump_nominee};
    sort_hands($game);

    # Start the game
    $game->{phase} = 'play';
    reset_turn($game);
    broadcast_gamestate($game);
}

# XXX: The most simplest (bulkiest) message we can send is to just
# broadcast the gamestate to all clients. This will be our temporary
# debugging method / MVP. We can trim down the communication later
sub broadcast_gamestate {
    my ($game) = @_;

    # Translate to human readable names for clients
    my @pnames = map { defined($_) ? $_->{name} : 'Empty' } @{$game->{players}};
    my @snames = map { $_->{name} } @{$game->{spectators}};

    # Hand lengths are nice for rendering in the clients
    my @hand_lengths =
        map { defined($_) ? scalar @{$_->{hand}} : 0 } @{$game->{players}};

    my $msg = {
        %$game,
        players => \@pnames,
        spectators => \@snames,
        hand_lengths => \@hand_lengths,
    };

    for my $p (@{$game->{players}}, @{$game->{spectators}}) {
        next unless defined $p;

        my $json = {
            msg_type => 'game_state',
            game => $msg,
            hand => $p->{hand},
            is_spectator => (exists $p->{seat}) ? 0 : 1,
            sit_out => $p->{sit_out},
        };
        $p->{ws}->send({ json => $json });
    }
}


sub send_error {
    my ($p, $errno) = @_;
    my $ws = $p->{ws};
    my $msg = defined $ERRORS[$errno] ? $ERRORS[$errno] : 'Unknown error';
    my $json = { msg_type => 'error', errno => $errno, msg => $msg };
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

# We only need this when trump suit voted, not every broadcast
sub sort_hands {
    my ($game) = @_;

    my $t = $game->{trump};
    for my $p (@{$game->{players}}) {
        my @sorted = sort { card_value($a, $t) <=> card_value($b, $t) } @{$p->{hand}};
        $p->{hand} = \@sorted;
    }
}

# Returns 0 or 1 on success
sub take_card {
    my ($p, $card) = @_;

    # Make sure they have the card, and update their hand
    for (my $i = 0; $i < scalar @{$p->{hand}}; $i++) {
        if ($p->{hand}->[$i] eq $card) {
            splice(@{$p->{hand}}, $i, 1);
            return 1;
        }
    }

    send_error($p, DONT_HAVE_CARD);
    return 0;
}

# Returns 0 or 1 on success
sub swap_player {
    my ($game, $new_p, $list) = @_;

    for (my $i = 0; $i < @{$game->{$list}}; $i++) {
        next unless defined $game->{$list}->[$i]; # undef potentially in lobby
        if ($game->{$list}->[$i]->{name} eq $new_p->{name}) {
            # Ye ole switcheroo
            # Don't delete the old player cuz we need to preserve the hand, etc.
            # Just swap out the WS and ID, and update PLAYERS
            my $old_id = $game->{$list}->[$i]->{id};
            $game->{$list}->[$i]->{id} = $new_p->{id};
            $game->{$list}->[$i]->{ws} = $new_p->{ws};
            $game->{$list}->[$i]->{active} = 1; # May have disconnected previously
            $PLAYERS{$new_p->{id}} = $game->{$list}->[$i];

            # NOTE: For now, don't delete from %PLAYERS here...
            # the old WS may still be playing ping/pong, so we just
            # let them hang out until they close themselves or go
            # inactive (and we time them out => delete from %PLAYERS)
            return 1;
        }
    }
    return 0;
}

# Global server stats for games in progress
# Poor man's monitoring :)
sub stats {
    my $num_players = scalar keys %PLAYERS;
    my $num_games = scalar keys %GAMES;
    
    my $msg = "";
    $msg .= "PLAYERS: Join Time\t\tName\tGame\n";
    $msg .= "===========================================================\n";
    for my $p (values %PLAYERS) {
        my $name = $p->{name} ? $p->{name} : 'UnnamedPlayer';
        my $game = $p->{game} ? $p->{game}->{id} : 'Lobby';
        $msg .= localtime($p->{joined}) . "\t$name\t$game\n";
    }
    $msg .= "-----------------------------------------------------------\n";
    $msg .= "$num_players\tPlayers\n";

    $msg .= "\n\nGAMES: Start Time\t\tname\n";
    $msg .= "===========================================================\n";
    for my $g (values %GAMES) {
        $msg .= localtime($g->{start_time}) . "\t$g->{id}\n";
    }
    $msg .= "-----------------------------------------------------------\n";
    $msg .= "$num_games\tGames\n";

    $msg .= "\n\nServer Stats\n";
    $msg .= "===========================================================\n";
    $msg .= "Server Start:     $START_TIME\n";
    $msg .= "Lifetime Games:   $TOTAL_GAMES\n";
    $msg .= "Lifetime Players: $TOTAL_PLAYERS\n";
    $msg .= "-----------------------------------------------------------\n";
    $msg .= "\n\nUptime: " . `uptime`;

    return $msg;
}

# Simple stateless broadcast to all clients in game
sub chat {
    my ($p, $msg) = @_;

    my $game = $p->{game};
    for my $player (@{$game->{players}}, @{$game->{spectators}}) {
        next unless defined $player;

        my $json = {
            msg_type => 'chat',
            msg => "$p->{name}: $msg->{msg}"
        };
        $player->{ws}->send({ json => $json });
    }
}

1;
