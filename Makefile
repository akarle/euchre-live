# Rebuilding the webpack for a server-only release is a painful
# few minutes on my poor old thinkpad. We can do better
JS_FILES := $(shell find assets)
PUBLIC_FILES := $(shell find public)
LIB_FILES := $(shell find lib)

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
.public.ts: $(JS_FILES) $(PUBLIC_FILES)
	./bin/build.sh
	touch .public.ts

# Only rebuild if any of public/ or the Perl stuff has changed
build: .public.ts $(LIB_FILES) gloat.pl
	rm -rf build
	mkdir -p build
	cp -a gloat.pl public lib build
	@echo ">>> Build Success! <<<"

.PHONY: release
release: build test
	git show HEAD --pretty=full -s |\
	    sed 's/\(Author\|Commit\): \([^<]\+\).*/\1: \2<redacted>/' > build/public/version.txt
	rsync -av --delete --rsh="ssh -o StrictHostKeyChecking=no" \
	    build/ www@euchre.live:/var/www/preprod-el/
	ssh -o StrictHostKeyChecking=no www@euchre.live \
	    env FORCE=$(FORCE) sh /var/www/restart.sh preprod

.PHONY: release-prod
release-prod: release
	ssh -o StrictHostKeyChecking=no www@euchre.live \
	    env FORCE=$(FORCE) UPDATE=1 sh /var/www/restart.sh prod

.PHONY: clean
clean:
	rm -rf build public/asset
