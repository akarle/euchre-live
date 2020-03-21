#!/usr/bin/env perl
# gloat.pl -- the Server
#
#    Those who Euchre Gloat never Win
#		~ Andy Karle
use Mojolicious::Lite;
use FindBin;
use lib "$FindBin::RealBin/lib";

use Euchre::Game;

get '/' => { text => play() };

app->start;
