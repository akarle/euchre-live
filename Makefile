# Rebuilding the webpack for a server-only release is a painful
# few minutes on my poor old thinkpad. We can do better
PUBLIC_FILES := $(shell find public -type f)
LIB_FILES := $(shell find lib -type f)

.PHONY: all
all: test tags

.PHONY: tags
tags:
	ctags -R lib/ t/ gloat.pl

.PHONY: test
test:
	perl -c gloat.pl
	perl t/Rules.t

# If no public files have changed, don't rebuild the webpack!
# We make this timestamp file the dependency for build to
# ensure we don't do it too often...
.public.ts: $(PUBLIC_FILES)
	./build.sh
	touch .public.ts

# Only rebuild if any of public/ or the Perl stuff has changed
build: .public.ts $(LIB_FILES) gloat.pl
	mkdir -p build
	cp -a gloat.pl public lib build
	@echo ">>> Build Success! <<<"

.PHONY: release
release: build test
	scp -r build/* www@euchre.live:/var/www/euchre-live
	ssh www@euchre.live sh /var/www/deploy.sh

.PHONY: clean
clean:
	rm -rf build
