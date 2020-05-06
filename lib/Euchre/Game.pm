# Euchre::Game -- the Game object
# Knows NOTHING about players, simply modifies game state based on seat num and
# actions (leaves it up to Table to coordinate between who can play when).
use strict;
use warnings;

package Euchre::Game;

use List::Util qw(sum);
use Mojo::IOLoop;

use Euchre::Errors;
use Euchre::Rules;

use Class::Tiny qw(trump out_player turn dealer caller pass_count led trump_nominee), {
    phase      => 'lobby',
    hands      => sub { [[],[],[],[]] },
    tricks     => sub { [0, 0, 0, 0] },
    table      => sub { [undef, undef, undef, undef] },
    score      => sub { $ENV{END_DEBUG} ? [9, 9] : [0, 0] },
};

sub BUILD {
    # Access some of the fields so that they are present in game_state from
    # the get-go (not waiting for lazy creation)
    my ($self) = @_;
    $self->$_ for qw(phase hands tricks table score);
}

sub next_turn {
    my ($self) = @_;

    my $turn = ($self->turn + 1) % 4;
    if ($turn == $self->out_player) {
        # It's a loner! Only gonna be one of these...
        $turn = ($turn + 1) % 4;
    }
    $self->turn($turn);
}

sub reset_turn {
    my ($self) = @_;
    $self->turn($self->dealer);
    $self->next_turn();
}

sub start_new_round {
    my ($self) = @_;

    # Shift dealer and deal
    $self->dealer(($self->dealer + 1) % 4);
    $self->trump(undef);
    $self->tricks([0,0,0,0]);
    $self->out_player(-1);
    $self->deal_hands();

    # Signal vote of player next to dealer...
    $self->reset_turn();
    $self->phase('vote');
    $self->pass_count(0);
}

sub deal_hands {
    my ($self) = @_;

    my ($handsA, $kiddeyA) = deal();
    $self->trump_nominee(shift @$kiddeyA);
    $self->hands($handsA);
    $self->sort_hands();
}

# We only need this when trump suit voted, not every broadcast
sub sort_hands {
    my ($self) = @_;

    my $t = $self->trump;
    for (my $i = 0; $i < 4; $i++) {
        my $hand = $self->hands->[$i];
        my @sorted = sort { card_value($a, $t) <=> card_value($b, $t) } @{$hand};
        $self->hands->[$i] = \@sorted;
    }
}


sub play_card {
    my ($self, $card) = @_;

    # HACK: Return 1 if Table needs to send a second delayed broadcast
    # Assume we don't
    my $do_update = 0;

    my %colors = (H => 'D', D => 'H', S => 'C', C => 'S');
    # Validate they follow suit if they CAN
    if (defined $self->led) {
        # Build up a list of valid cards
        my @followers = map { $_ . $self->led } qw(N T Q K A); # no jack
        if ($self->led eq $self->trump) {
            # Trump led, both jacks valid
            push @followers, "J" . $self->led;
            push @followers, "J" . $colors{$self->led};
        } elsif ($colors{$self->led} ne $self->trump) {
            # Off-color, jack is OK
            push @followers, "J" . $self->led;
        } else {
            # Played same color as trump, don't add jack
        }
        my $follower_re = join("|", @followers);

        # Now validate that they are EITHER:
        #   1) Following Suit
        #   2) Can't follow suit
        # By checking negative of both
        if ($card !~ /$follower_re/ &&
            grep { $_ =~ /$follower_re/ } @{$self->curr_hand}) {
            return FOLLOW_SUIT;
        }
    }

    $self->take_card($card) or return DONT_HAVE_CARD;

    # Update the table and current player
    $self->add_to_table($card);
    $self->next_turn();


    my $played_cards = scalar grep { defined } @{$self->table};
    if ($played_cards == 1) {
        # First card!
        my ($val, $suit) = split('', $card);

        # Special case Jack of Color == trump
        if ($val eq 'J' && $suit eq $colors{$self->trump}) {
            $self->led($self->trump);
        } else {
            $self->led($suit);
        }
    }

    # Adjust num cards on table by if there's an out player
    my $out_adj = ($self->out_player >= 0 ? 1 : 0);
    if ($played_cards >= (4 - $out_adj)) {
        # End trick -- update tricks, clear table, and set current player
        my @table = map { defined($_) ? $_ : 'X' } @{$self->table};
        my $winner_id = trick_winner($self->trump, $self->led, @table);

        # Update the gamestate and pause so all can see
        $self->tricks->[$winner_id]++;
        $self->turn($winner_id);
        $self->phase('pause');

        # Sub to call after pause
        my $post_pause = sub {};

        my @num_tricks = grep { /^\d+$/ } @{$self->tricks};
        if (sum(@num_tricks) >= 5) {
            # End round -- update scores, clear tricks, push dealer
            my ($team_id, $score) = score_round($self->caller, @{$self->tricks});
            $self->score->[$team_id] += $score;

            if ($self->score->[$team_id] >= 10) {
                $post_pause = sub { $self->phase('end') };
            } else {
                $post_pause = sub { $self->start_new_round() };
            }
        }


        $do_update = 1;
        Mojo::IOLoop->timer(1.5 => sub {
            $self->table([undef, undef, undef, undef]);
            $self->led(undef);
            $self->phase('play');

            $post_pause->();
        });

    }

    return SUCCESS, $do_update;
}

sub take_card {
    my ($self, $card) = @_;

    my $hand = $self->curr_hand;

    # Make sure they have the card, and update their hand
    for (my $i = 0; $i < scalar @{$hand}; $i++) {
        if ($hand->[$i] eq $card) {
            splice(@{$hand}, $i, 1);
            return 1;
        }
    }

    return 0;
}


sub dealer_swap {
    my ($self, $card) = @_;

    # Exchange the cards
    $self->take_card($card) or return DONT_HAVE_CARD;

    push @{$self->hands->[$self->dealer]}, $self->trump_nominee;
    $self->sort_hands();

    # Start the game
    $self->phase('play');
    $self->reset_turn();

    return SUCCESS;
}


sub order {
    my ($self, $vote, $loner) = @_;

    if ($vote eq 'pass') {
        $self->next_turn();
        $self->pass_count($self->pass_count + 1);
        if ($self->pass_count >= 8) {
            # Throw em in
            $self->start_new_round();
        } 
    } elsif ($vote) {
        # Validate its an OK vote
        if ($self->pass_count < 4 && $self->trump_nominee !~ /$vote/) {
            return VOTE_ON_KITTY;
        } elsif ($self->pass_count >=4 && $self->trump_nominee =~ /$vote/) {
            return VOTE_OFF_KITTY;
        }

        # Accept the vote...
        $self->trump($vote);
        $self->caller($self->turn);
        if ($loner) {
            my $partner_seat = ($self->turn + 2) % 4;
            $self->out_player($partner_seat);
            $self->tricks->[$partner_seat] = 'X';
        }
        if ($self->pass_count < 4) {
            # Setting phase will block all other play actions until the
            # dealer is done swapping. Do still broadcast so dealer knows!
            # Piggy back on the handle_msg turn validation by temporarily
            # setting "turn" to dealer.
            $self->phase('dealer_swap');
            $self->turn($self->dealer);
        } else {
            # Get right to it!
            $self->phase('play');
            $self->reset_turn();
        }
        $self->sort_hands();
    } else {
        return BAD_VOTE;
    }
    return SUCCESS;
}

sub hand_lengths {
    my ($self) = @_;
    return [map { scalar @{$_} } @{$self->hands}];
}

sub curr_hand {
    my ($self) = @_;
    return $self->hands->[$self->turn];
}

sub add_to_table {
    my ($self, $card) = @_;
    $self->table->[$self->turn] = $card;
}

sub start_game {
    my ($self, $start_seat) = @_;

    # One less since start_new_round will rotate
    $self->dealer($start_seat - 1);
    $self->start_new_round();

    return SUCCESS;
}

1;
