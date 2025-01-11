#!/usr/bin/env perl
# gloat.pl -- the Server
#
#    Those who Euchre Gloat never Win
#		~ Andy Karle
use Mojolicious::Lite;
use Mojo::JSON qw(decode_json);
use Mojo::IOLoop;
use FindBin;
use lib "$FindBin::RealBin/lib";

$::LOG = app->log; # save off for global access, befroe loading Euchre::Host
use Euchre::Host;

# Always log in debug, regardless of prod vs preprod
app->log->level('debug');

get '/' => sub {
    my $c = shift;
    $c->render(template => 'index', tables => list_tables);
};

get '/new-game' => sub {
    my $c = shift;
    $c->render(template => 'new-game', tables => list_tables);
};

get '/game' => sub {
    my $c = shift;
    if (app->mode() eq 'production') {
        $c->reply->static('prod.html');
    } else {
        $c->reply->static('preprod.html');
    }
};

get '/tables' => sub {
    my $c = shift;
    $c->render(json => { tables => list_tables });
};

get '/debug' => sub {
    my $c = shift;
    $c->reply->static('debug.html');
};

get '/stats' => sub {
    my $c = shift;
    $c->render(text => stats, format => 'txt');
};

websocket '/play' => sub {
    my $c = shift;

    my $id = ''.$c->tx;
    app->log->debug("New player: $id");

    # Register the player with the server
    register_player($c->tx);

    $c->on(message => sub {
        my ($c, $msg) = @_;
        handle_msg($id, decode_json($msg));
    });

    $c->on(finish => sub {
        gloaters_never_win($id);
    });
};

my $cleanup_time = $ENV{DEBUG} ? 1 : 300;
Mojo::IOLoop->recurring($cleanup_time => sub {
        prune_tables();
        prune_players();
    });

# Our prod environment is a true daemon
if (app->mode() eq 'production') {
    app->hook(
        before_server_start => sub {
            my ($server, $app) = @_;
            $server->daemonize();
            app->log->path("/var/log/gloat/prod.log");
        }
    );
}

app->start;
