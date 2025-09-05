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
PKG                 ?= 
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
.PHONY: all lint build test fmt clippy clean crossinstall crossbuild

all: build test

# add preinstall later
# name fmt more generic to make GH Action more reusable
lint:
	$(CARGO) fmt --all -- --check

build:
	$(CARGO) build --release --locked

test:
	$(CARGO) test --release --locked

# use phony lint instead
fmt:
	$(CARGO) fmt --all

clippy:
	$(CARGO) clippy --all-targets -- -D warnings

clean:
	$(CARGO) clean

# install cross tool
crossinstall:
	$(CARGO) install cross --git https://github.com/cross-rs/cross

crossbuild:
	cross build --release $(TARGET_FLAG)
