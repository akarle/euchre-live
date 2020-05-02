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

1;
