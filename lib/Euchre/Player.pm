# Player.pm -- a Player class for each websocket client
use strict;
use warnings;

package Euchre::Player;

use Euchre::Errors;

use Class::Tiny qw(id ws start_time), {
    seat => -1, # spectator
    name => 'Anon',
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

sub is_spectator {
    my ($self) = @_;
    return $self->seat == -1;
}

sub stand_up {
    my ($self) = @_;
    if ($self->is_spectator) {
        return ALREADY_STANDING;
    } else {
        $self->seat(-1);
    }
    return SUCCESS;
}

1;
