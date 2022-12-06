# Deploy

## Install Sui

Clone [`suia`](https://github.com/Mynft/suia) and [`sui`](https://github.com/MystenLabs/sui) repo into the same directory.

```bash
cd sui
# pull latest devnet branch
git checkout devnet
git pull
cargo build --release
cp ./target/release/sui /some/dir/in/path

# check version
sui -V
1.17.0
```

## Deploy and Test Suia

```bash
cd suia
task demo-suia -f
```

## Deploy and Test Suia Capy

Edit `move_packages/suia/Move.toml` and change the addresses as below to its real addresses on devnet.

```toml
[addresses]
capy =  "0x1ff1cfbb8e31ee527ac3361cdeda860b54e7c815"
mynft = "0xe0679dcda7283697becce2fd639f40115ffca93a"
```

Change the address in the deps.
1. Edit `move_packages/suia/Move.toml` and change the `mynft` address.
2. Edit `sui/sui_programmability/examples/capy/Move.toml` and change the `capy` address.

Run `task demo-capy -f` to deploy and test suia capy.
