# Euchre::Game -- the Game Logic
use strict;
use warnings;

package Euchre::Game;

require Exporter;
our @ISA = qw(Exporter);

our @EXPORT = qw(play);

sub play {
    return "Let's play some Euchre!";
}

1;
