# Euchre::Card -- Conversion routines for Cards
use strict;
use warnings;

package Euchre::Card;

require Exporter;
our @ISA = qw(Exporter);
our @EXPORT = qw(cid_to_name cname_to_id suit_to_id id_to_suit);

our @SUITS = qw(H D S C);
our @CARDS = qw(N T J Q K A);

# Put the indices of the above in a hash for ~speed~
our %SUIT_IDS = (
    H => 0,
    D => 1,
    S => 2,
    C => 3,
);

our %CARD_IDS = (
    N => 0,
    T => 1,
    J => 2,
    Q => 3,
    K => 4,
    A => 5,
);

sub cid_to_name {
    my $card_id = shift;

    my $suit = $SUITS[int($card_id / 6)];
    my $val  = $CARDS[$card_id % 6];

    return "$val$suit";
}

sub cname_to_id {
    my $card_name = shift;
    my ($val, $suit) = split('', $card_name);
    return (6 * $SUIT_IDS{$suit}) + $CARD_IDS{$val};
}

sub suit_to_id {
    return $SUIT_IDS{$_[0]};
}

sub id_to_suit {
    my ($id) = @_;
    for my $k (keys %SUIT_IDS) {
        if ($SUIT_IDS{$k} == $id) {
            return $k;
        }
    }
    die "assert: bad suit";
}

1;
