# OpenFrame Client Scripts

## Run Local Agent

1. Run script `./scripts/setup_dev_init_config.sh`
2. Enter access token
3. `cd client`
4. `cargo build`
5. `sudo -E env OPENFRAME_DEV_MODE=true ./target/debug/openframe`