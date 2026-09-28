# openframe-client (thin binary)

Entry point for the OpenFrame agent in the OSS tenant. The agent
implementation lives in the shared library **`openframe-agent-lib`** in
[openframe-oss-lib](https://github.com/flamingo-stack/openframe-oss-lib)
(under `clients/openframe-client`); this crate is only a thin binary that calls
`openframe::run()`.

Build (the library's build script requires `OPENFRAME_VERSION`):

```bash
OPENFRAME_VERSION=0.0.0-dev cargo build --release
```

The dependency is pinned to a library release tag (see `Cargo.toml`). For local
development against a side-by-side checkout of openframe-oss-lib, override with a
path dependency, e.g.:

```toml
[patch."https://github.com/flamingo-stack/openframe-oss-lib.git"]
openframe-agent-lib = { path = "../../../openframe-oss-lib/clients/openframe-client" }
```
