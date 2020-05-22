# Euchre::Dealer -- enforcer of turns, speaker of state
#  * Communicates Game state to Players at table
#  * Ensures everyone is following the rules
use strict;
use warnings;

package Euchre::Dealer;

use Euchre::Errors;
use Euchre::Game;

use Class::Tiny qw(id), {
    password => '',
    game     => sub { Euchre::Game->new() },
    players  => sub { {} },
    start_time => sub { time },
};

sub BUILD {
    my ($self) = @_;
    # de lazy the attributes
    $self->$_ for qw(start_time);
}

sub add_player {
    my ($self, $p, $password) = @_;

    $password //= '';
    if ($self->password && $password ne $self->password) {
        return BAD_PASS;
    }

    if (grep { $_->name eq $p->{name} } values %{$self->players}) {
        return UNIQUE_USER;
    }
    $self->players->{$p->{id}} = $p;
    $self->broadcast_gamestate();

    return SUCCESS;
}

sub remove_player {
    my ($self, $p) = @_;

    $p->stand_up();
    delete $self->players->{$p->{id}};
    $self->broadcast_gamestate();

    return SUCCESS;
}

# Top level handler to dispatch into the appropriate message.
# Called by the Host for table specific routines
# Takes in the player id and the JSON msg and runs the
# appropriate handler, which is responsible for responding via ws
sub handle_msg {
    my ($self, $cid, $msg) = @_;

    # Crazy magic dispatch of
    #
    #   action => [ handler, req-keys, req-phase, phase-err, needs-turn ]
    #
    # The last three are optional, but are useful to dedupe common
    # assertions (like, needs to be their turn)
    my %dispatch = (
        # Game management endpoints
        chat         => [\&chat, ['msg']],
        take_seat    => [\&take_seat, ['seat']],
        stand_up     => [\&stand_up, []],
        start_game   => [\&start_game, [], 'lobby', START_GAME],
        restart_game => [\&restart_game, [], 'end', RESTART_GAME],

        # Gameplay
        order        => [\&order, ['vote'], 'vote', ORDER, 1],
        dealer_swap  => [\&dealer_swap, ['card'], 'dealer_swap', DEALER_SWAP, 1],
        play_card    => [\&play_card, ['card'], 'play', PLAY_CARD, 1],
    );


    if (!exists $dispatch{$msg->{action}}) {
        warn "Unknown dealer API action: $msg->{action}";
        return;
    }

    my $p = $self->players->{$cid};
    my ($handler, $req_keys, $req_phase, $phase_err, $turn_based) =
        @{$dispatch{$msg->{action}}};

    # Validate that all required msg keys are present
    for my $k (@$req_keys) {
        if (!exists $msg->{$k}) {
            $p->error(MISSING_PARAM);
            return;
        }
    }

    # Next validate phase, turn, and handle success/failure
    if ($req_phase && ($self->game->phase ne $req_phase)) {
        $p->error($phase_err);
    } elsif ($turn_based && ($p->seat != $self->game->turn)) {
        $p->error(TURN);
    } else {
        if (my $errno = $handler->($self, $p, $msg)) {
            $p->error($errno);
        } else {
            # All successful Dealer handlers broadcast to all players on success
            # (except for chat...)
            if ($msg->{action} ne 'chat') {
                $self->broadcast_gamestate();
            }
        }
    }
}

# seat
sub take_seat {
    my ($self, $p, $msg) = @_;

    my $seat = $msg->{seat};

    if ($seat > 3 || $seat < 0) {
        return INVALID_SEAT;
    }

    if (grep { $_->seat == $seat } values %{$self->players}) {
        return TAKEN_SEAT;
    } else {
        # Move from standing (or sitting) to sitting
        if (!$p->is_spectator()) {
            $p->stand_up();
        }
        $p->seat($seat);
    }

    return SUCCESS;
}

sub stand_up {
    my ($self, $p) = @_;
    return $p->stand_up();
}

# start_seat: -1 - 3
sub start_game {
    my ($self, $p, $msg) = @_;

    if ($self->num_players() < 4) {
        return PARTIAL_GAME;
    }

    if ($msg->{start_seat} > 4) {
        return INVALID_SEAT;
    }

    if (!defined $msg->{start_seat} || $msg->{start_seat} < 0) {
        $msg->{start_seat} = int(rand(4));
    }

    return $self->game->start_game($msg->{start_seat});
}

sub restart_game {
    my ($self) = @_;
    $self->game(Euchre::Game->new());
    return SUCCESS;
}

sub num_players {
    my ($self) = @_;
    return scalar grep { !$_->is_spectator } values %{$self->players};
}

# msg.vote  = 'suit' or 'pass'
# msg.loner = 0 or 1
sub order {
    my ($self, $p, $msg) = @_;
    return $self->game->order($msg->{vote}, $msg->{loner});
}

# msg.card => 'AH'
sub play_card {
    my ($self, $p, $msg) = @_;
    my ($errno, $do_update) = $self->game->play_card($msg->{card});

    if ($errno) {
        return $errno;
    } else {
        if ($do_update) {
            Mojo::IOLoop->timer(2 => sub { $self->broadcast_gamestate() });
        }
        return SUCCESS;
    }
}

# Based on validation, we KNOW $p is the dealer
# msg.card = card to swap
sub dealer_swap {
    my ($self, $p, $msg) = @_;
    return $self->game->dealer_swap($msg->{card});
}

sub broadcast_gamestate {
    my ($self) = @_;

    # Translate to human readable names for clients
    my @snames = map { $_->name } @{$self->spectators};

    my $msg = {
        %{$self->game},
        players => $self->player_names,
        spectators => \@snames,
        hand_lengths => $self->game->hand_lengths,
    };
    delete $msg->{hands};

    for my $p (values %{$self->players}) {

        my $json = {
            msg_type => 'game_state',
            game => $msg,
            is_spectator => $p->is_spectator ? 1 : 0,
            table_id => $self->id,
        };

        if (!$p->is_spectator) {
            $json->{hand} = $self->game->hands->[$p->seat];
        } else {
            $json->{hand} = [];
        }
        $p->send($json);
    }
}

# Simple stateless broadcast to all clients in game
sub chat {
    my ($self, $p, $msg) = @_;

    my $json = {
        msg_type => 'chat',
        msg      => $p->name . ": $msg->{msg}"
    };
    $self->broadcast($json);
}

# Send a message to all players at the table
sub broadcast {
    my ($self, $json) = @_;
    for my $p (values %{$self->players}) {
        $p->send($json);
    }
}

# TODO: When we decide to broadcast Euchre tournies of millions,
# rewrite this to be an array to minimize number of times we
# iterate through it on broadcast_gamestate ... until then? prosper
sub spectators {
    my ($self) = @_;
    my @specs = grep { $_->is_spectator } values %{$self->players};
    return \@specs;
}

sub player_names {
    my ($self) = @_;
    my $seated = ['Empty', 'Empty', 'Empty', 'Empty'];
    for my $p (grep { !$_->is_spectator } values %{$self->players}) {
        $seated->[$p->seat] = $p->name;
    }
    return $seated;
}

# Used to decide when to cleanup
sub is_active {
    my ($self) = @_;
    my $n = scalar keys %{$self->players};
    return $n != 0;
}

1;
