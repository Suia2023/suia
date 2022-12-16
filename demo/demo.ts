import { Ed25519Keypair, JsonRpcProvider, RawSigner } from '@mysten/sui.js';
import * as fs from 'fs';
require('dotenv').config()

const provider = new JsonRpcProvider(process.env.SUI_RPC_URL);
const keypairseed = process.env.KEY_PAIR_SEED;
// seed 32 bytes, private key 64 bytes
const keypair = Ed25519Keypair.fromSeed(Uint8Array.from(Buffer.from(keypairseed!, 'hex')));
const signer = new RawSigner( keypair, provider );

const gasBudget = 100000;

interface PublishResult {
  medalModuleId: string,
  medalStoreId: string,
}

async function publish(): Promise<PublishResult> {
  const compiledModules = [fs.readFileSync('move_packages/suia/build/MyNFT/bytecode_modules/suia.mv', {encoding: 'base64'})];
  const publishTxn = await signer.publish({
    compiledModules,
    gasBudget: 10000,
  });
  console.log('publishTxn', JSON.stringify(publishTxn, null, 2));
  const newObjectEvent = (publishTxn as any).EffectsCert.effects.effects.events.filter((e: any) => e.newObject !== undefined)[0].newObject;
  console.log('newObjectEvent', JSON.stringify(newObjectEvent, null, 2));
  const medalModuleId = newObjectEvent.packageId;
  const medalStoreId = newObjectEvent.objectId;
  return {
    medalModuleId,
    medalStoreId,
  }
}

async function interact_with_medal(params: PublishResult) {
  // create medal
  const { medalModuleId, medalStoreId } = params;
  const createMedalTxn = await signer.executeMoveCall({
    packageObjectId: medalModuleId,
    module: 'suia',
    function: 'create_medal',
    typeArguments: [],
    arguments: [
      medalStoreId,
      'Car',
      'Car Description',
      100,
      [],
      'https://api.nodes.guru/wp-content/uploads/2021/12/0pD8rO18_400x400.jpg',
    ],
    gasBudget: 10000,
  });
  console.log('createMedalTxn', JSON.stringify(createMedalTxn));
  const medalId = (createMedalTxn as any).EffectsCert.effects.effects.events.filter((e: any) => e.newObject?.objectType === `${medalModuleId}::suia::Medal`)[0].newObject.objectId;
  // claim medal
  const claimMedalTxn = await signer.executeMoveCall({
    packageObjectId: medalModuleId,
    module: 'suia',
    function: 'claim_medal',
    typeArguments: [],
    arguments: [
      medalId,
    ],
    gasBudget: 10000,
  });
  console.log('claimMedalTxn', JSON.stringify(claimMedalTxn));
}

// medalModuleId and medalStoreId should be app config
// userAddr should come from plugin wallet
async function queries(medalModuleId: string, medalStoreId: string, userAddr: string) {
  const medalStore = await provider.getObject(medalStoreId);
  console.log(`medalStore: ${JSON.stringify(medalStore, null, 2)}`);
  const medalsTableID = (medalStore as any).details.data.fields.medals.fields.id.id;
  const medals = await provider.getObjectsOwnedByObject(medalsTableID);
  console.log(`medals: ${JSON.stringify(medals, null, 2)}`);
  // query medal details, this data can be cached by frontend
  const cachedMedalDetails: any = {};
  for (const medal of medals) {
    const medalIdDetail = await provider.getObject(medal.objectId);
    console.log(`medalIdDetail: ${JSON.stringify(medalIdDetail, null, 2)}`);
    const medalId = (medalIdDetail as any).details.data.fields.value;
    const medalDetail = await provider.getObject(medalId);
    console.log(`medalDetail: ${JSON.stringify(medalDetail, null, 2)}`);
    cachedMedalDetails[medalId] = (medalDetail.details as any).data.fields;
  }
  // query user medal gallery
  const userMedals = (await provider.getObjectsOwnedByAddress(userAddr)).filter(obj => obj.type === `${medalModuleId}::suia::PersonalMedal`);
  console.log(`userMedals: ${JSON.stringify(userMedals, null, 2)}`);
  console.log(`cachedMedalDetails: ${JSON.stringify(cachedMedalDetails, null, 2)}`);
  for (const medal of userMedals) {
    const personalMedal = await provider.getObject(medal.objectId);
    console.log(`personalMedal: ${JSON.stringify(personalMedal, null, 2)}`);
    const medalDetail = cachedMedalDetails[(personalMedal as any).details.data.fields.medal];
    console.log(`userMedalDetail: ${JSON.stringify(medalDetail, null, 2)}`);
  }
}

async function claim(medalModuleId: string, medalId: string) {
  const claimMedalTxn = await signer.executeMoveCall({
    packageObjectId: medalModuleId,
    module: 'suia',
    function: 'claim_medal',
    typeArguments: [],
    arguments: [
      medalId,
    ],
    gasBudget,
  });
  console.log('claimMedalTxn', JSON.stringify(claimMedalTxn));
}

async function create(medalModuleId: string, medalStoreId: string): Promise<string> {
  const createMedalTxn = await signer.executeMoveCall({
    packageObjectId: medalModuleId,
    module: 'suia',
    function: 'create_medal',
    typeArguments: [],
    arguments: [
      medalStoreId,
      'Car',
      'Car Description',
      100,
      [],
      'https://api.nodes.guru/wp-content/uploads/2021/12/0pD8rO18_400x400.jpg',
    ],
    gasBudget,
  });
  console.log('createMedalTxn', JSON.stringify(createMedalTxn));
  const medalId = (createMedalTxn as any).EffectsCert.effects.effects.created![0].reference.objectId
  return medalId;
}

async function main() {
  console.log('-----start-----');
  const addr = await signer.getAddress();
  console.log(`address: 0x${addr}`);
  const objs = await provider.getObjectsOwnedByAddress('0x' + addr);
  console.log(`objects of ${addr} are ${JSON.stringify(objs, null, 2)}`);

  const publishResult = await publish();
  console.log(`PublishResult: ${JSON.stringify(publishResult, null, 2)}`);
  await interact_with_medal(publishResult);
  const { medalModuleId, medalStoreId } = publishResult;
  await queries(medalModuleId, medalStoreId, addr);
  console.log('-----end-----');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`error: ${error.stack}`);
    process.exit(1);
  });
