euchre.live
===========

[![builds.sr.ht status](https://builds.sr.ht/~akarle/euchre-live/commits/.build.yml.svg)](https://builds.sr.ht/~akarle/euchre-live/commits/.build.yml?)

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
  - Alternatively, on OpenBSD 6.9, the packaged `p5-Mojolicious` and
    `p5-Class-Tiny` packages are sufficient to run the server!

### Getting the Dependencies

On Linux:

```sh
$ npm i
$ cpanm --installdeps .
```

On OpenBSD (6.9):

```sh
$ doas pkg_add node p5-Mojolicious p5-Class-Tiny
$ npm i
```

### Building the Release

The release version is a subset of the repo, built into a separate directory
for easier deployment.

```sh
$ ./bin/build.sh
```

### Running the Server

```sh
$ ./build/gloat.pl daemon
```

To actually daemonize (in a production environment), run with `-m production`.
This will log to /var/log/gloat, which should exist and be writable to the
server.

```sh
$ ./build/gloat.pl daemon -m production
```

Hacking
-------
For fast iteration on the code, we have a `npm` script to watch the JS files with
`esbuild` and rebuild the bundle on the fly:

```sh
$ ./gloat.pl daemon # fire up backend first
$ npm run dev
```

License
-------
[MIT](./LICENSE)
