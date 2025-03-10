ASSETS := $(shell find assets)
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

# If no public files have changed, don't rebuild the JS bundle
# We make this timestamp file the dependency for build to
# ensure we don't do it too often...
.assets.ts: $(ASSETS)
	./bin/build.sh
	touch .assets.ts

# Only rebuild if any of public/ or the Perl stuff has changed
build: .assets.ts $(PUBLIC_FILES) $(LIB_FILES) gloat.pl
	rm -rf build
	mkdir -p build
	cp -a gloat.pl public lib build
	@echo ">>> Build Success! <<<"

.PHONY: release
release: build test
	git show HEAD --pretty=full -s |\
	    sed 's/\(Author\|Commit\): \([^<]\+\).*/\1: \2<redacted>/' > build/public/version.txt
	rsync -av --delete --rsh="ssh -o StrictHostKeyChecking=no" \
	    build/ _euchre@euchre.alexkarle.com:prod-el/
	ssh -t -o StrictHostKeyChecking=no _euchre@euchre.alexkarle.com \
	    doas rcctl restart euchre

.PHONY: clean
clean:
	rm -rf build public/asset
