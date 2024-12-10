FROM debian:stable-slim AS builder

# Set environment variables for ARM platforms and compilers
ENV VCPKG_FORCE_SYSTEM_BINARIES=1 \
    CC=/usr/bin/gcc \
    CXX=/usr/bin/g++ \
    CFLAGS="-Wno-stringop-overflow" \
    CXXFLAGS="-Wno-stringop-overflow" \
    RUSTFLAGS="-C target-feature=+crt-static" \
    PKG_CONFIG_PATH="/usr/lib/aarch64-linux-gnu/pkgconfig"

# Add ARM64 architecture and update package lists
RUN dpkg --add-architecture arm64 && \
    apt update && \
    apt install -y \
    g++ \
    gcc \
    git \
    curl \
    wget \
    nasm \
    yasm \
    clang \
    cmake \
    pkg-config \
    zip \
    unzip \
    tar \
    ninja-build \
    build-essential \
    crossbuild-essential-arm64 \
    libc6:arm64 \
    libstdc++6:arm64 \
    libvpx-dev:arm64 \
    libpulse-dev:arm64 \
    libasound2-dev:arm64 \
    libopus-dev:arm64 \
    libgtk-3-dev:arm64 \
    libgdk-3-dev:arm64 \
    libglib2.0-dev:arm64 \
    libpango1.0-dev:arm64 \
    libcairo2-dev:arm64 \
    libatk1.0-dev:arm64 \
    libgdk-pixbuf2.0-dev:arm64 \
    xz-utils \
    libglu1-mesa

# Install vcpkg with error handling
RUN git clone https://github.com/Microsoft/vcpkg.git /vcpkg && \
    cd /vcpkg && \
    ./bootstrap-vcpkg.sh || exit 1
ENV VCPKG_ROOT=/vcpkg

# Install Rust and add ARM target
WORKDIR /tmp
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
    . $HOME/.cargo/env && \
    rustup target add aarch64-unknown-linux-gnu
ENV PATH="/root/.cargo/bin:${PATH}"

# Create .cargo/config with linker configuration
RUN mkdir -p /root/.cargo && \
    echo '[target.aarch64-unknown-linux-gnu]' > /root/.cargo/config && \
    echo 'linker = "aarch64-linux-gnu-gcc"' >> /root/.cargo/config && \
    echo 'rustflags = ["-C", "link-arg=-L/usr/lib/aarch64-linux-gnu"]' >> /root/.cargo/config

# Build RustDesk
WORKDIR /src
RUN git clone https://github.com/rustdesk/rustdesk.git .

# Copy customization files
COPY config.toml src/
COPY client.rs src/
COPY common.tis src/ui/
COPY logo.png src/ui/static/

# Create pkg-config wrapper for cross-compilation
RUN echo '#!/bin/sh' > /usr/local/bin/aarch64-pkg-config && \
    echo 'export PKG_CONFIG_PATH=/usr/lib/aarch64-linux-gnu/pkgconfig' >> /usr/local/bin/aarch64-pkg-config && \
    echo 'export PKG_CONFIG_LIBDIR=/usr/lib/aarch64-linux-gnu/pkgconfig' >> /usr/local/bin/aarch64-pkg-config && \
    echo 'pkg-config --static "$@"' >> /usr/local/bin/aarch64-pkg-config && \
    chmod +x /usr/local/bin/aarch64-pkg-config && \
    ln -s /usr/local/bin/aarch64-pkg-config /usr/local/bin/aarch64-unknown-linux-gnu-pkg-config

# Build with target specification and debug info
RUN PKG_CONFIG=/usr/local/bin/aarch64-pkg-config \
    PKG_CONFIG_ALLOW_CROSS=1 \
    RUST_BACKTRACE=full \
    RUSTDESK_FEATURE_FLAGS="--features inline,vendored" \
    cargo build --release --target=aarch64-unknown-linux-gnu -vv \
    --no-default-features \
    $RUSTDESK_FEATURE_FLAGS

# Install Flutter
RUN git clone https://github.com/flutter/flutter.git /flutter && \
    cd /flutter && \
    git checkout ${FLUTTER_VERSION} && \
    /flutter/bin/flutter doctor && \
    /flutter/bin/flutter config --no-analytics && \
    /flutter/bin/flutter precache
ENV PATH="/flutter/bin:${PATH}"

WORKDIR /src/flutter
RUN flutter pub get && \
    flutter build linux --release

# Copy Flutter build artifacts in final stage
COPY --from=builder /src/flutter/build/linux/x64/release/bundle /usr/local/share/rustdesk/

FROM debian:stable-slim
RUN apt update && \
    apt install -y \
    libxcb-randr0 \
    libxdo3 \
    libxfixes3 \
    libxcb-shape0 \
    libxcb-xfixes0 \
    libasound2 \
    libpulse0 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libpam0g \
    libopus0 \
    libvpx7 \
    libyuv0

COPY --from=builder /src/target/aarch64-unknown-linux-gnu/release/rustdesk /usr/local/bin/
CMD ["rustdesk"]