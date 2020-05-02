# Euchre::Game -- the Game object
use strict;
use warnings;

package Euchre::Game;

use Class::Tiny qw(id trump out_player turn dealer caller password pass_count led trump_nominee), {
    phase      => 'lobby',
    players    => sub { [undef, undef, undef, undef] },
    spectators => sub { [] },
    tricks     => sub { [0, 0, 0, 0] },
    table      => sub { [undef, undef, undef, undef] },
    score      => sub { $ENV{END_DEBUG} ? [9, 9] : [0, 0] },
    start_time => sub { time },
};

sub next_turn {
    my ($self) = @_;

    my $turn = ($self->turn + 1) % 4;
    if ($turn == $self->out_player) {
        # It's a loner! Only gonna be one of these...
        $turn = ($turn + 1) % 4;
    }
    $self->turn($turn);
}

sub reset_turn {
    my ($self) = @_;
    $self->turn($self->dealer);
    $self->next_turn();
}

1;
