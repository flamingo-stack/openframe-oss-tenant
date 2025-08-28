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
PROFILE             ?= release            # release | debug
TARGET              ?= --all-targets      # e.g. x86_64-unknown-linux-gnu
FEATURES            ?=                    # e.g. "foo bar"
ALL_FEATURES        ?= 0                  # 1 to use --all-features
NO_DEFAULT_FEATURES ?= 0                  # 1 to use --no-default-features
PKG                 ?= openframe          # e.g. crate name in a workspace
TEST_ARGS           ?=                    # extra args to `cargo test`, e.g. "-- --nocapture"

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
.PHONY: all build test fmt clippy clean
# add preinstall later

all: build test

build:
	$(CARGO) build $(RELEASE_FLAG) $(TARGET_FLAG) $(PKG_FLAG) $(FEATURES_FLAG) $(NODFLT_FLAG) $(ALLFEAT_FLAG)

test:
	$(CARGO) test $(RELEASE_FLAG) $(TARGET_FLAG) $(PKG_FLAG) $(FEATURES_FLAG) $(NODFLT_FLAG) $(ALLFEAT_FLAG) $(TEST_ARGS)

fmt:
	$(CARGO) fmt --all

clippy:
	$(CARGO) clippy $(TARGET_FLAG) $(PKG_FLAG) $(FEATURES_FLAG) $(NODFLT_FLAG) $(ALLFEAT_FLAG) -- -D warnings

clean:
	$(CARGO) clean
