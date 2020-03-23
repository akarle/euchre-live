#!/usr/bin/env perl
# Card.t -- tests for Euchre::Card
use strict;
use warnings;

use FindBin;
use lib "$FindBin::Bin/../lib";

use Euchre::Card;
use Test::More;

is(cname_to_id('AH'), 5, 'AH -> 5');
is(cname_to_id('AD'), 11, 'AD -> 11');
is(cname_to_id('NH'), 0, 'NH -> 0');
is(cname_to_id('TS'), 13, 'TS -> 13');

is(cid_to_name(5), 'AH', '5  -> AH');
is(cid_to_name(11), 'AD', '11 -> AD');
is(cid_to_name(0), 'NH', '0  -> NH');
is(cid_to_name(13), 'TS', '13 -> TS');

is(suit_to_id('H'), 0, 'Hearts suit to ID');
is(suit_to_id('D'), 1, 'Diamonds suit to ID');
is(suit_to_id('S'), 2, 'Spades suit to ID');


done_testing();
