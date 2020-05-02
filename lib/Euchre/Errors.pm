# Euchre::Errors -- constants and messages for all other objects
use strict;
use warnings;

package Euchre::Errors;

# NOTE: Append ONLY for client compatibility
use constant {
    CHANGE_SEAT     => 0,
    STAND_UP        => 1,
    START_GAME      => 2,
    RESTART_GAME    => 3,
    ORDER           => 4,
    DEALER_SWAP     => 5,
    PLAY_CARD       => 6,
    TURN            => 7,
    UNIQUE_USER     => 8,
    INVALID_SEAT    => 9,
    TAKEN_SEAT      => 10,
    ALREADY_STANDING => 11,
    PARTIAL_GAME    => 12,
    VOTE_ON_KITTY   => 13,
    VOTE_OFF_KITTY  => 14,
    BAD_VOTE        => 14,
    FOLLOW_SUIT     => 16,
    DONT_HAVE_CARD  => 17,
    NOT_IN_GAME     => 18,
    BAD_PASS        => 19,
};

require Exporter;
our @ISA = qw(Exporter);
our @EXPORT = qw(
    err_msg
    CHANGE_SEAT
    STAND_UP
    START_GAME
    RESTART_GAME
    ORDER
    DEALER_SWAP
    PLAY_CARD
    TURN
    UNIQUE_USER
    INVALID_SEAT
    TAKEN_SEAT
    ALREADY_STANDING
    PARTIAL_GAME
    VOTE_ON_KITTY
    VOTE_OFF_KITTY
    BAD_VOTE
    FOLLOW_SUIT
    DONT_HAVE_CARD
    NOT_IN_GAME
    BAD_PASS
);

our @ERR_MSGS = ();
$ERR_MSGS[CHANGE_SEAT]     = "Can't change seats during game";
$ERR_MSGS[STAND_UP]        = "Can't change seats during game";
$ERR_MSGS[START_GAME]      = "Game already started";
$ERR_MSGS[RESTART_GAME]    = "Game hasn't ended";
$ERR_MSGS[ORDER]           = "Not time for a vote";
$ERR_MSGS[DEALER_SWAP]     = "Can't swap with Kitty now";
$ERR_MSGS[PLAY_CARD]       = "Can't play cards yet";
$ERR_MSGS[TURN]            = "Not your turn";
$ERR_MSGS[UNIQUE_USER]     = "Username not unique; is this you?";
$ERR_MSGS[INVALID_SEAT]    = "Invalid seat";
$ERR_MSGS[TAKEN_SEAT]      = "Seat is taken";
$ERR_MSGS[ALREADY_STANDING] = "Already standing!";
$ERR_MSGS[PARTIAL_GAME]    = "Can't start with empty seats";
$ERR_MSGS[VOTE_ON_KITTY]   = "Must vote on kitty's suit";
$ERR_MSGS[VOTE_OFF_KITTY]  = "Can't vote for kitty card suit after turned down";
$ERR_MSGS[BAD_VOTE]        = "Bad vote";
$ERR_MSGS[FOLLOW_SUIT]     = "Have to follow suit!";
$ERR_MSGS[DONT_HAVE_CARD]  = "You don't have that card!";
$ERR_MSGS[NOT_IN_GAME]     = "You're not in any game";
$ERR_MSGS[BAD_PASS]        = "Game exists, password incorrect";

sub err_msg {
    my ($errno) = @_;
    my $msg = defined $ERR_MSGS[$errno] ? $ERR_MSGS[$errno] : 'Unknown Error';

    return $msg;
}

1;
