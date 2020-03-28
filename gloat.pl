#!/usr/bin/env perl
# gloat.pl -- the Server
#
#    Those who Euchre Gloat never Win
#		~ Andy Karle
use Mojolicious::Lite;
use Mojo::JSON qw(decode_json);
use FindBin;
use lib "$FindBin::RealBin/lib";

use Euchre::Dealer;

get '/' => sub {
    my $c = shift;
    $c->reply->static('index.html');
};

websocket '/play' => sub {
    my $c = shift;

    my $id = ''.$c->tx;
    app->log->debug("New player: $id");

    # Register the player with the Dealer
    register_player($c->tx);

    $c->on(message => sub {
        my ($c, $msg) = @_;
        handle_msg($id, decode_json($msg));
    });

    $c->on(finish => sub {
        app->log->debug("Player $id exiting");
        gloaters_never_win($id);
    });
};

app->start;
