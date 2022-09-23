import { Ed25519Keypair, JsonRpcProvider, RawSigner } from '@mysten/sui.js';
const { execSync } = require('child_process');
require('dotenv').config()

const provider = new JsonRpcProvider('https://gateway.devnet.sui.io:443');
const keypairseed = process.env.KEY_PAIR_SEED;
// seed 32 bytes, private key 64 bytes
const keypair = Ed25519Keypair.fromSeed(Uint8Array.from(Buffer.from(keypairseed!, 'hex')));
const signer = new RawSigner( keypair, provider );

async function publish(): Promise<string> {
  const compiledModules = JSON.parse(
    execSync(
      `sui move build --dump-bytecode-as-base64 --path .`,
      { encoding: 'utf-8' }
    )
  );
  const publishTxn = await signer.publish({
    compiledModules,
    gasBudget: 10000,
  });
  console.log('publishTxn', publishTxn);
  return publishTxn.effects.created![0].reference.objectId
}

async function interact_with_medal(medalModuleId: string) {
  // create medal_store
  // this should be called by admin, and save the result `medalStoreId` for app config
  const createMedalStoreTxn = await signer.executeMoveCall({
    packageObjectId: medalModuleId,
    module: 'sui_medal',
    function: 'create_medal_store',
    typeArguments: [],
    arguments: [],
    gasBudget: 10000,
  });
  console.log('createMedalStoreTxn', createMedalStoreTxn);
  const medalStoreId = createMedalStoreTxn.effects.created![0].reference.objectId
  console.log(`medalStoreId: ${medalStoreId}`);
  // create medal
  const createMedalTxn = await signer.executeMoveCall({
    packageObjectId: medalModuleId,
    module: 'sui_medal',
    function: 'create_medal',
    typeArguments: [],
    arguments: [
      medalStoreId,
      'sui con',
      'sui con 2022',
      100,
      [],
      'ipfs://logo',
    ],
    gasBudget: 10000,
  });
  console.log('createMedalTxn', createMedalTxn);
  const medalId = createMedalTxn.effects.created![0].reference.objectId
  // claim medal
  const claimMedalTxn = await signer.executeMoveCall({
    packageObjectId: medalModuleId,
    module: 'sui_medal',
    function: 'claim_medal',
    typeArguments: [],
    arguments: [
      medalId,
    ],
    gasBudget: 10000,
  });
  console.log('claimMedalTxn', claimMedalTxn);
  return medalStoreId
}

// medalModuleId and medalStoreId should be app config
// userAddr should come from plugin wallet
async function queries(medalModuleId: string, medalStoreId: string, userAddr: string) {
  const medalStore = await provider.getObject(medalStoreId);
  console.log(`medalStore: ${JSON.stringify(medalStore, null, 2)}`);
  const medals = (medalStore as any).details.data.fields.medals;
  console.log(`medals: ${JSON.stringify(medals, null, 2)}`);
  // query medal details, this data can be cached by frontend
  const cachedMedalDetails: any = {};
  for (const medal of medals) {
    const medalDetail = await provider.getObject(medal);
    console.log(`medalDetail: ${JSON.stringify(medalDetail, null, 2)}`);
    cachedMedalDetails[medal] = (medalDetail.details as any).data.fields;
  }
  // query user medal gallery
  const userMedals = (await provider.getObjectsOwnedByAddress(userAddr)).filter(obj => obj.type === `${medalModuleId}::sui_medal::PersonalMedal`);
  console.log(`userMedals: ${JSON.stringify(userMedals, null, 2)}`);
  console.log(`cachedMedalDetails: ${JSON.stringify(cachedMedalDetails, null, 2)}`);
  for (const medal of userMedals) {
    const personalMedal = await provider.getObject(medal.objectId);
    console.log(`personalMedal: ${JSON.stringify(personalMedal, null, 2)}`);
    const medalDetail = cachedMedalDetails[(personalMedal as any).details.data.fields.medal];
    console.log(`userMedalDetail: ${JSON.stringify(medalDetail, null, 2)}`);
  }
}

async function main() {
  console.log('-----start-----');
  const addr = await signer.getAddress();
  console.log(`address: 0x${addr}`);
  const objs = await provider.getObjectsOwnedByAddress('0x' + addr);
  console.log(`objects of ${addr} are ${JSON.stringify(objs, null, 2)}`);

  const medalModuleId = await publish();
  console.log(`medalModuleId: ${medalModuleId}`);
  const medalStoreId = await interact_with_medal(medalModuleId);
  console.log(`medalStoreId: ${medalStoreId}`);
  await queries(medalModuleId, medalStoreId, addr);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`error: ${error.stack}`);
    process.exit(1);
  });
