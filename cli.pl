#!/usr/bin/env perl
# cli.pl -- CLI version of the game
# good for testing
use strict;
use warnings;
use FindBin;
use lib "$FindBin::RealBin/lib";
use Euchre::Game;
use Euchre::Card;

my ($hands, $kiddey) = deal();

my %players = (
    Alex    => $hands->[0],
    Dad     => $hands->[1],
    Jennie  => $hands->[2],
    Mom     => $hands->[3],
);

for my $p (sort keys %players) {
    print "$p\t";
    print map { "\t" . cid_to_name($_) } @{$players{$p}};
    print "\n";
}
