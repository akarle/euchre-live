.PHONY: all
all: test tags

.PHONY: tags
tags:
	ctags -R lib/ t/ gloat.pl

.PHONY: test
test:
	perl -c gloat.pl
	perl t/Rules.t

.PHONY: release
release: test
	./build.sh
	scp -r build/* www@euchre.live:/var/www/euchre-live
	ssh www@euchre.live sh /var/www/deploy.sh
