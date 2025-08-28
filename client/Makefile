# Makefile for Rust (project or workspace)
# Usage:
#   make build                             # release build
#   make test                              # run tests (release by default)
#   make build PROFILE=debug               # debug build
#   make build TARGET=x86_64-unknown-linux-gnu
#   make test PKG=my-crate TEST_ARGS="-- --nocapture"
#   make clippy ALL_FEATURES=1

CARGO ?= cargo

# ---- Knobs you can pass like: make build PROFILE=debug TARGET=... ----
PROFILE             ?= release
TARGET              ?= 
FEATURES            ?= 
ALL_FEATURES        ?= 0
NO_DEFAULT_FEATURES ?= 0
PKG                 ?= openframe
TEST_ARGS           ?= 

# ---- Derived flags (don’t edit) ----
ifneq ($(TARGET),)
  TARGET_FLAG := --target $(TARGET)
endif

ifeq ($(PROFILE),release)
  RELEASE_FLAG := --release
endif

ifneq ($(FEATURES),)
  FEATURES_FLAG := --features "$(FEATURES)"
endif

ifeq ($(ALL_FEATURES),1)
  ALLFEAT_FLAG := --all-features
  FEATURES_FLAG :=
  NODFLT_FLAG :=
else ifeq ($(NO_DEFAULT_FEATURES),1)
  NODFLT_FLAG := --no-default-features
endif

ifneq ($(PKG),)
  PKG_FLAG := -p $(PKG)
endif

.DEFAULT_GOAL := all
.PHONY: all lint build test fmt clippy clean
# add preinstall later

all: build test

# name fmt more generic to make GH Action more reusable
lint:
	$(CARGO) fmt --all -- --check

build:
# bypass actual build as for now
#	$(CARGO) build $(RELEASE_FLAG) $(TARGET_FLAG) $(PKG_FLAG) $(FEATURES_FLAG) $(NODFLT_FLAG) $(ALLFEAT_FLAG)
	tar -czvf $(PKG)-$(TARGET).tgz test.sh

test:
	$(CARGO) test $(RELEASE_FLAG) $(TARGET_FLAG) $(PKG_FLAG) $(FEATURES_FLAG) $(NODFLT_FLAG) $(ALLFEAT_FLAG) $(TEST_ARGS)

# use phony lint instead
fmt:
	$(CARGO) fmt --all

clippy:
##	$(CARGO) clippy $(TARGET_FLAG) $(PKG_FLAG) $(FEATURES_FLAG) $(NODFLT_FLAG) $(ALLFEAT_FLAG) -- -D warnings
# force clippy for all targets
	$(CARGO) clippy --all-targets -- -D warnings

clean:
	$(CARGO) clean
