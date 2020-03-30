# Euchre::Game -- the Game Logic
# All card interactions are based on ID for ~speed~
# Leaves it to client to map from 'names' (i.e. AH -> 5)
use strict;
use warnings;

package Euchre::Game;

require Exporter;
our @ISA = qw(Exporter);
our @EXPORT = qw(
    deal
    trick_winner
    score_round
);

use Euchre::Card;
use List::Util qw(shuffle);

sub deal {
    my @cards = shuffle (0 .. 23);

    my @hands;
    for (my $i = 0; $i < 4; $i++) {
        push @{$hands[$i]}, @cards[((5*$i) .. (5*($i+1)-1))];
    }
    my @kiddey = @cards[20 .. 23];


    return \@hands, \@kiddey;
}

sub trick_winner {
    my ($trump, @cards) = @_;

    # Assign each card a value based on trump + led, either
    #   Bower:    card + 50
    #   Trump:    card + 25 (including Bower)
    #   Suit Led: card
    #   Other:    0
    my $led = int($cards[0] / 6);
    my @values = @cards;
    for (my $i = 0; $i < @values; $i++) {
        # Identify the card
        my $c = $cards[$i];
        my $suit = int($c / 6);
        my $is_jack = ($c % 6 == 2);
        my $is_tcolor = (int($suit / 2) == int($trump / 2));
        my $is_bower = ($is_jack && $is_tcolor);

        # Assign it a value
        if ($is_bower) {
            $values[$i] += 50;
        }
        if ($suit == $trump) {
            $values[$i] += 25;
        } elsif ($suit != $led && !$is_bower) {
            # throwoff -> set value to zero
            $values[$i] = 0;
        } else {
            # non-trump led card -> use regular value
        }
    }

    my $winning_ind = -1;
    my $winning_val = -1;
    for (my $i = 0; $i < @values; $i++) {
        if ($values[$i] > $winning_val) {
            $winning_ind = $i;
            $winning_val = $values[$i];
        }
    }

    return $winning_ind;
}

# Given # tricks per player, who won? What score?
# Use X to indicate sat-out. $caller is a seat_no
# Returns idx of team, points to give
sub score_round {
    my ($caller, @tricks) = @_;

    my $callers = $caller % 2;
    my $setters = 1 - $callers;
    my $loner = 0;
    my @totals;
    for (my $i = 0; $i < 4; $i++) {
        if ($tricks[$i] eq 'X') {
            $loner = 1;
        } else {
            $totals[$i % 2] += $tricks[$i];
        }
    }
    
    if ($totals[$callers] == 5) {
        if ($loner) {
            # Hot diggity dog!
            return $callers, 4;
        } else {
            # Respectable
            return $callers, 2;
        }
    } elsif($totals[$callers] > $totals[$setters]) {
        # Made your point...
        return $callers, 1;
    } else {
        # We've been Euched, Bill!
        return $setters, 2;
    }

    die 'assert';
}

1;
