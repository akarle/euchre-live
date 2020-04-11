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

use List::Util qw(shuffle);

# Numeric values for trick_winner
our %SUIT_VALS = (H => 0, D => 1, S => 2, C => 3);
our %CARD_VALS = (N => 0, T => 1, J => 2, Q => 3, K => 4, A => 5);

our @FULL_DECK = qw(
    NH TH JH QH KH AH
    ND TD JD QD KD AD
    NS TS JS QS KS AS
    NC TC JC QC KC AC
);

sub card_value {
    my ($c) = @_;
    if ($c eq 'X') {
        return -1;
    }
    my ($val, $suit) = split('', $c);
    return (6 * $SUIT_VALS{$suit} + $CARD_VALS{$val});
}

sub deal {
    my @cards = shuffle @FULL_DECK;

    my @hands;
    for (my $i = 0; $i < 4; $i++) {
        push @{$hands[$i]}, @cards[((5*$i) .. (5*($i+1)-1))];
    }
    my @kiddey = @cards[20 .. 23];

    return \@hands, \@kiddey;
}

# This is the only sub left that uses the original numeric
# approach to tracking cards, due to the convenience of
# sorting by a numeric value. To provide a consistent interace,
# it takes in the character representations, but immediately
# "lowers" them to the integer counterparts
#
#          0 1 2 3 4 5
#   Suits: H D S C
#   Cards: N T J Q K A
#
# A card of 'X' denotes a loner
sub trick_winner {
    my ($trump, $led, @cards) = @_;

    $trump = $SUIT_VALS{$trump};
    $led = $SUIT_VALS{$led};
    my @values = map { card_value($_) } @cards;

    # Assign each card a value based on trump + led, either
    #   Bower:    card + 50
    #   Trump:    card + 25 (including Bower)
    #   Suit Led: card
    #   Other:    0
    for (my $i = 0; $i < @values; $i++) {
        next if $values[$i] < 0; # indicates loner

        # Identify the card
        my $c = $values[$i];
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
