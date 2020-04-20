#!/usr/bin/env perl
# Game.t -- tests for Euchre::Game
use strict;
use warnings;

use FindBin;
use lib "$FindBin::Bin/../lib";

use Euchre::Game;
use List::Util;
use Test::More;

sub test_deal {
    my ($handsA, $kiddey) = deal();
    is(scalar @{$handsA}, 4, '4 hands dealt');
    is(scalar @{$kiddey}, 4, '4 cards in kiddey');
    
    my @cards;
    push @cards, @{$_} for @{$handsA};
    is(scalar @cards, 20, '20 cards dealt to hands');

    my @all_suits = qw(H D S C);
    my @all_cards = qw(N T J Q K A);
    my @full_deck;
    for my $c (@all_cards) {
        for my $s (@all_suits) {
            push @full_deck, "$c$s";
        }
    }

    my @dealt = sort(@cards, @{$kiddey});
    is_deeply(\@dealt, [sort @full_deck], 'All 24 cards dealt');

}

sub test_trick_winner {
    my @tests = (
        # [Trump, Led, Cards], Winner Idx, Desc
        [['H', 'H', 'NH', 'TS', 'AS', 'QS'], 0, 'Trump suit led'],
        [['D', 'H', 'JH', 'TS', 'JD', 'QD'], 2, 'Jack trump beats all'],
        [['D', 'C', 'NC', 'JH', 'AD', 'AC'], 1, 'Jack color beats all others'],
        [['S', 'S', 'NS', 'JH', 'AD', 'JC'], 3, 'Jack color beats all others (2)'],
        [['S', 'H', 'NS', 'JH', 'AD', 'AH'], 0, 'Trump beats ace'],
        [['C', 'H', 'NH', 'JH', 'QH', 'AH'], 3, 'No trump, highest of led'],
        [['C', 'H', 'NH', 'JH', 'AH'], 2, 'No trump, highest of led, 3 cards'],
        [['C', 'S', 'NH', 'JH', 'AH', 'NS'], 3, 'No trump, suit led wins'],
    );

    for my $t (@tests) {
        my ($trump, $led, @cards) = @{$t->[0]};
        is(trick_winner($trump, $led, @cards), $t->[1], $t->[2]);
    }

}

sub test_score_round {
    my @tests = (
        [[0, 1,2,1,1], [1, 2], 'Euched!'],
        [[1, 2,1,1,1], [0, 2], 'Euched again!'],
        [[3, 2,3,0,0], [1,1], 'Made your point'],
        [[1, 0,3,0,2], [1,2], 'Got em all!'],
        [[0, 5,0,'X',0], [0,4], 'Loneeeer!'],
        [[2, 3,1,'X',1], [0,1], 'Failed loner'],
    );

    for my $t (@tests) {
        my ($winners, $points) = score_round(@{$t->[0]});
        is_deeply([$winners, $points], $t->[1], $t->[2]);
    }
}

sub test_card_value {
    ok(card_value('AH', 'H') < card_value('JH', 'H'), 'right bower highest');
    ok(card_value('AH', 'H') < card_value('JD', 'H'), 'left bower higher than ace');
    ok(card_value('JH', 'H') > card_value('JD', 'H'), 'left bower lower');
    ok(card_value('ND', 'H', 'D') > card_value('TC', 'H', 'D'), 'throwoff');
}

test_deal();
test_trick_winner();
test_score_round();
test_card_value();

done_testing();
