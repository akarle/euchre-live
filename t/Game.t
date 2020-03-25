#!/usr/bin/env perl
# Game.t -- tests for Euchre::Game
use strict;
use warnings;

use FindBin;
use lib "$FindBin::Bin/../lib";

use Euchre::Game;
use Euchre::Card;
use List::Util;
use Test::More;

sub test_deal {
    my ($handsA, $kiddey) = deal();
    is(scalar @{$handsA}, 4, '4 hands dealt');
    is(scalar @{$kiddey}, 4, '4 cards in kiddey');
    
    my @cards;
    push @cards, @{$_} for @{$handsA};
    is(scalar @cards, 20, '20 cards dealt to hands');

    my @deck = sort { $a <=> $b } (@cards, @{$kiddey});
    is_deeply(\@deck, [0 .. 23], 'All 24 cards unique');

}

sub test_trick_winner {
    my @tests = (
        # [Trump, Cards], Winner Idx, Desc
        [['H', 'NH', 'TS', 'AS', 'QS'], 0, 'Trump suit led'],
        [['D', 'JH', 'TS', 'JD', 'QD'], 2, 'Jack trump beats all'],
        [['D', 'NC', 'JH', 'AD', 'AC'], 1, 'Jack color beats all others'],
        [['S', 'NS', 'JH', 'AD', 'JC'], 3, 'Jack color beats all others (2)'],
        [['C', 'NH', 'JH', 'QH', 'AH'], 3, 'No trump, highest of led'],
        [['C', 'NH', 'JH', 'AH'], 2, 'No trump, highest of led, 3 cards'],
    );

    for my $t (@tests) {
        # Unpack, transform, test
        my ($trump, @cards) = @{$t->[0]};
        $trump = suit_to_id($trump);
        @cards = map { cname_to_id($_) } @cards;
        is(trick_winner($trump, @cards), $t->[1], $t->[2]);
    }

}

sub test_score_round {
    my @tests = (
        [[0, 1,2,1,1], [1, 2], 'Euched!'],
        [[1, 2,1,1,1], [0, 2], 'Euched again!'],
        [[1, 2,3,0,0], [1,1], 'Made your point'],
        [[1, 0,3,0,2], [1,2], 'Got em all!'],
        [[0, 5,0,'X',0], [0,4], 'Loneeeer!'],
        [[0, 3,1,'X',1], [0,1], 'Failed loner'],
    );

    for my $t (@tests) {
        my ($winners, $points) = score_round(@{$t->[0]});
        is_deeply([$winners, $points], $t->[1], $t->[2]);
    }
}

test_deal();
test_trick_winner();
test_score_round();

done_testing();
