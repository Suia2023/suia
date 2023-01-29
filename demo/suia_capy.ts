import { Ed25519Keypair, JsonRpcProvider, RawSigner } from '@mysten/sui.js';
import * as fs from 'fs';
import {SuiObjectInfo} from "@mysten/sui.js/src/types";
require('dotenv').config()

// go to https://capy.art/collection to get a free capy
// check the tx in explorer, and get this 3 params
// https://explorer.sui.io/transaction/HnxFaYEcRbHFW1A2mksEPvgt23GfvZYg5gtHMSPvQWAd?network=devnet
const EDEN = process.env.EDEN!;
const CAPY_REGISTRY_ID = process.env.CAPY_REGISTRY_ID!;
const CAPY_MODULE_ID = process.env.CAPY_MODULE_ID!;

const provider = new JsonRpcProvider(process.env.SUI_RPC_URL);
const keypairseed = process.env.KEY_PAIR_SEED;
// seed 32 bytes, private key 64 bytes
const keypair = Ed25519Keypair.fromSeed(Uint8Array.from(Buffer.from(keypairseed!, 'hex')));
const signer = new RawSigner( keypair, provider );

const gasBudget = 100000;

interface PublishResult {
  packageId: string,
  objectId: string,
}

async function publish(): Promise<PublishResult> {
  const compiledModules = [fs.readFileSync(`move_packages/suia/build/MyNFT/bytecode_modules/suia_capy.mv`, {encoding: 'base64'})];
  const publishTxn = await signer.publish({
    compiledModules,
    gasBudget,
  });
  console.log('publishTxn', JSON.stringify(publishTxn, null, 2));
  const newObjectEvent = (publishTxn as any).EffectsCert.effects.effects.events.filter((e: any) => e.newObject !== undefined)[0].newObject;
  console.log('newObjectEvent', JSON.stringify(newObjectEvent, null, 2));
  const packageId = newObjectEvent.packageId;
  const objectId = newObjectEvent.objectId;
  return {
    packageId,
    objectId,
  }
}

async function claim(medalModuleId: string, medalId: string): Promise<string> {
  const tx = await signer.executeMoveCall({
    packageObjectId: medalModuleId,
    module: 'suia',
    function: 'claim_medal',
    typeArguments: [],
    arguments: [
      medalId,
    ],
    gasBudget,
  });
  console.log('tx', JSON.stringify(tx));
  return (tx as any).EffectsCert.effects.effects.created![0].reference.objectId;
}

async function eden_breed_capy(): Promise<string> {
  const tx = await signer.executeMoveCall({
    packageObjectId: CAPY_MODULE_ID,
    module: 'eden',
    function: 'get_capy',
    typeArguments: [],
    arguments: [
      EDEN,
      CAPY_REGISTRY_ID,
    ],
    gasBudget,
  });
  console.log('tx', JSON.stringify(tx, null, 2));
  const capyId = (tx as any).EffectsCert.effects.effects.created![0].reference.objectId
  return capyId;
}

// input 2 capies and breed a new one
async function capy_breed_and_keep(capy1: string, capy2: string): Promise<string> {
  const tx = await signer.executeMoveCall({
    packageObjectId: CAPY_MODULE_ID,
    module: 'capy',
    function: 'breed_and_keep',
    typeArguments: [],
    arguments: [
      CAPY_REGISTRY_ID,
      capy1,
      capy2,
    ],
    gasBudget,
  });
  console.log('tx', JSON.stringify(tx, null, 2));
  return (tx as any).EffectsCert.effects.effects.created![0].reference.objectId;
}

async function create_and_send_item(
  suiaCapyModuleId: string,
  capId:string,
  type: string,
  name: string,
  recipient: string,
): Promise<string> {
  const tx = await signer.executeMoveCall({
    packageObjectId: suiaCapyModuleId,
    module: 'suia_capy',
    function: 'batch_create_and_send_item',
    typeArguments: [],
    arguments: [
      capId,
      type,
      name,
      [
        recipient,
      ],
    ],
    gasBudget,
  });
  console.log('tx', JSON.stringify(tx, null, 2));
  return (tx as any).EffectsCert.effects.effects.created![0].reference.objectId;
}

async function wrap_capy_with_item(
  suiaCapyModuleId: string,
  capyId: string,
  itemId: string,
): Promise<string> {
  const tx = await signer.executeMoveCall({
    packageObjectId: suiaCapyModuleId,
    module: 'suia_capy',
    function: 'wrap_capy_with_item',
    typeArguments: [],
    arguments: [
      capyId,
      itemId,
      'suia capy',
      'suia capy description'
    ],
    gasBudget,
  });
  console.log('tx', JSON.stringify(tx, null, 2));
  return (tx as any).EffectsCert.effects.effects.created![0].reference.objectId;
}

async function wrap_suia_capy_with_item(
  suiaCapyModuleId: string,
  suiaCapyId: string,
  itemId: string,
): Promise<void> {
  const tx = await signer.executeMoveCall({
    packageObjectId: suiaCapyModuleId,
    module: 'suia_capy',
    function: 'wrap_suia_capy_with_item',
    typeArguments: [],
    arguments: [
      suiaCapyId,
      itemId,
      'suia capy',
      'suia capy description'
    ],
    gasBudget,
  });
  console.log('tx', JSON.stringify(tx, null, 2));
}

async function main() {
  console.log('-----start-----');
  const addr = await signer.getAddress();
  console.log(`address: 0x${addr}`);
  const objs = await provider.getObjectsOwnedByAddress('0x' + addr);
  console.log(`objects of ${addr} are ${JSON.stringify(objs, null, 2)}`);
  // breed new capy
  let capies: string[] = [];
  let num = 0;
  for (let obj of objs) {
    if(obj.type !== `${CAPY_MODULE_ID}::capy::Capy`) {
      continue
    }
    const res = await provider.getObject(obj.objectId)
    console.log(`id: ${obj.objectId}, type: ${obj.type}, status: ${res.status}`)
    if(res.status === 'Exists') {
      capies.push(obj.objectId)
      num += 1
      if (num >= 2) {
        break
      }
    }
  }
  console.log('capies', JSON.stringify(capies, null, 2));
  let capy1Id;
  let capy2Id;
  if (num < 2) {
    capy1Id = await eden_breed_capy();
    capy2Id = await eden_breed_capy();
  } else {
    capy1Id = capies[0];
    capy2Id = capies[1];
  }
  console.log('capy1Id', capy1Id);
  console.log('capy2Id', capy2Id);
  const capyId = await capy_breed_and_keep(capy1Id, capy2Id);
  console.log('capyId', capyId);
  // publish
  const publishResult = await publish();
  console.log('publishResult', JSON.stringify(publishResult, null, 2));
  const {packageId: suiaCapyModuleId, objectId: suiaCapyCapObjectId} = publishResult;
  // create item
  const recipient = '0x' + addr;
  // const recipient = '0xd891c5e938da31c715a9bcd4a026f75ae40d4260';
  const flagId = await create_and_send_item(suiaCapyModuleId, suiaCapyCapObjectId, 'flag', 'brazil', recipient);
  const soccerId = await create_and_send_item(suiaCapyModuleId, suiaCapyCapObjectId, 'soccer', 'soccer', recipient);
  // wrap capy with flag
  const suiaCapyId = await wrap_capy_with_item(suiaCapyModuleId, capyId, flagId);
  // query suia capy
  let suiaCapy = await provider.getObject(suiaCapyId);
  console.log('suiaCapy', JSON.stringify(suiaCapy, null, 2));
  // wrap suia capy with soccer
  await wrap_suia_capy_with_item(suiaCapyModuleId, suiaCapyId, soccerId);
  suiaCapy = await provider.getObject(suiaCapyId);
  console.log('suiaCapy', JSON.stringify(suiaCapy, null, 2));
  console.log('-----end-----');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`error: ${error.stack}`);
    process.exit(1);
  });
