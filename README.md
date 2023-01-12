# Suia

![](https://suia.io/images/logo.041cb08a7cb597d5be0092d97bc0e2b8.png)

> Collect your Suia in the Sui world

Visit the product on Devnet @ <https://suia.io/>.

## Development Quick Start

```bash
# install sui cli: <https://docs.sui.io/build/install>
# check sui installed
$ sui -V
sui 0.20.0

# install dependencies
$ yarn install

$ cp .env.example .env
# edit .env, replace KEY_PAIR_SEED with a random hex string
# you can generate it with command `openssl rand -hex 32`

# run demo
$ yarn demo
yarn run v1.22.19
$ ts-node demo/demo.ts
-----start-----
address: 0x8a4662abf9f8b7aa947b174f29a7a8f259e111e5
objects of 0x8a4662abf9f8b7aa947b174f29a7a8f259e111e5 are []
error: Error: Error publishing package Error: RPC Error: No non-argument gas objects found with value >= budget 10000

# you should get error like above
# fund your account with devnet faucet: <https://docs.sui.io/build/devnet#request-gas-tokens>
# and try again

# check the explorer: <https://explorer.devnet.sui.io/addresses/0xbd0629c41d90c3c7918c4dee42829f900bfe2c13>
# replace the address with your own
```
