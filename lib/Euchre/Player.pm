# Player.pm -- a Player class for each websocket client
use strict;
use warnings;

package Euchre::Player;

use Euchre::Errors;

#       {
#           id   => client id (key in %PLAYERS)
#           name => username,
#           seat => undef OR 0-3,
#           ws   => websocket obj,
#           active => ...
#       }
#
use Class::Tiny qw(id ws seat game), {
    joined => sub { time },
    name   => 'Anon',
    hand   => sub { [] },
    active => 1,
};

sub error {
    my ($self, $errno) = @_;
    my $json = {
        msg_type => 'error',
        errno => $errno,
        msg => err_msg($errno),
    };
    $self->send($json);
}

# Send a JSON message
sub send {
    my ($self, $json) = @_;
    $self->ws->send({ json => $json });
}

1;
