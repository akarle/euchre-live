# Euchre::Rules -- the core Game Logic
#
# (previously called Euchre::Game before the great(?) OOP refactor)
use strict;
use warnings;

package Euchre::Rules;

require Exporter;
our @ISA = qw(Exporter);
our @EXPORT = qw(
    deal
    trick_winner
    score_round
    card_value
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

sub raw_card_value {
    my ($c) = @_;
    if ($c eq 'X') {
        return -1;
    }
    my ($val, $suit) = split('', $c);
    return (6 * $SUIT_VALS{$suit} + $CARD_VALS{$val});
}

sub card_value {
    my ($c, $trump, $led) = @_;

    # Lower to numeric value
    my $cval = raw_card_value($c);

    return $cval if $cval < 0;

    # If neither trump or led defined, we just use raw_value
    # (useful for initial deal hand orderings)
    return $cval unless defined $trump;

    # Gather more data on it
    $trump = $SUIT_VALS{$trump};
    my $suit = int($cval / 6);
    my $is_jack = ($cval % 6 == 2);
    my $is_trump = ($suit == $trump);
    my $is_tcolor = (int($suit / 2) == int($trump / 2));
    my $is_bower = ($is_jack && $is_tcolor);

    # To create a absolute ordering we give
    # +50 -- all bowers
    # +25 -- all trump (not incl. J of color)
    # +0  -- all others (use raw value)
    $cval += 50 if $is_bower;
    $cval += 25 if $is_trump;

    # If we are ranking based on suit led, all throwoffs are
    # considered value 0
    # NOTE: not always defined, i.e. when sorting hand
    if (defined $led) {
        $led = $SUIT_VALS{$led};
        if ($suit != $led && !($is_trump || $is_bower)) {
            # throwoff -> set value to zero
            $cval = 0;
        }
    }

    return $cval;
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

    my @values = map { card_value($_, $trump, $led) } @cards;

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
