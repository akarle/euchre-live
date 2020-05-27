euchre.live
===========

[![builds.sr.ht status](https://builds.sr.ht/~akarle/euchre-live/.build.yml.svg)](https://builds.sr.ht/~akarle/euchre-live/.build.yml?)

For my family <3

About
-----
Euchre is a card game. It is our "family game", frequently played at family
reunions due to its ability to both engage players and be a game you can sit
back and chat over without thinking too much.

With the COVID-19 social-distancing, we're suddenly unable to play, so we
started to look at options to play online.

Disappointed with the state of the online options, we decided to make our own.

The production version is playable now at [euchre.live](http://euchre.live), but
the code is all free under the MIT license, so feel free to hack it or host your
own!

Installation
------------

### Prerequisites

* Perl (tested on 5.30, but should be pretty portable)
* Node (tested on 12.15.0, no idea how portable)
* npm
* [cpanminus](https://metacpan.org/pod/App::cpanminus)

### Getting the Dependencies

```sh
$ npm i
$ cpanm --installdeps .
```

### Building the Release

The release version is a subset of the repo, built into a separate directory
for easier deployment.

```sh
$ ./build.sh
```

### Running the Server

```sh
$ ./build/gloat.pl daemon
```

Hacking
-------

Use [run.sh](./run.sh) to run the server with webpack watching the files
for incremental rebuilding (while hacking).

```sh
$ ./run.sh
```

This is not how it is run in production, as the overhead of webpack is quite
high.

License
-------
MIT
