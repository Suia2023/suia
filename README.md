# Quick Start

```bash
# install sui cli: <https://docs.sui.io/build/install>
# check sui installed
$ sui -V
sui 0.9.0

# install dependencies
$ yarn install

$ cp .env.example .env
# edit .env KEY_PAIR_SEED

# run demo
$ yarn demo
yarn run v1.22.19
$ ts-node demo/demo.ts
-----start-----
address: 0xb656b57eab3022ae8f644134aa4084a3b2c38ab6
objects of b656b57eab3022ae8f644134aa4084a3b2c38ab6 are []
error: Error: Error publishing package Error: RPC Error: No non-argument gas objects found with value >= budget 10000

# you should get error like above
# fund your account with devnet faucet: <https://docs.sui.io/build/devnet#request-gas-tokens> and try again
```
