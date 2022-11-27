import { Ed25519Keypair, JsonRpcProvider, RawSigner } from '@mysten/sui.js';
import * as fs from 'fs';
require('dotenv').config()

const CapyRegistryID = '0x484bbd3ffb6700ac0fd3353cebc297d55df905c8';
const CAPY_MODULE_ID = '0xfea7e09c8e07665037ed83871e32e4150c6f5b51';

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
  const compiledModules = [fs.readFileSync(`move_packages/suia_football_capy/build/SuiaFootballCapy/bytecode_modules/suia_football_capy.mv`, {encoding: 'base64'})];
  const publishTxn = await signer.publishWithRequestType({
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
  const tx = await signer.executeMoveCallWithRequestType({
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
  const tx = await signer.executeMoveCallWithRequestType({
    packageObjectId: CAPY_MODULE_ID,
    module: 'eden',
    function: 'breed',
    typeArguments: [],
    arguments: [
      '0xa901e27ce4dd9327ad578e08646bb19c2c41d5b9',
      '0x484bbd3ffb6700ac0fd3353cebc297d55df905c8',
    ],
    gasBudget,
  });
  console.log('tx', JSON.stringify(tx));
  const capyId = (tx as any).EffectsCert.effects.effects.created![0].reference.objectId
  return capyId;
}

// input 2 capies and breed a new one
async function capy_breed_and_keep(capy1: string, capy2: string): Promise<string> {
  const tx = await signer.executeMoveCallWithRequestType({
    packageObjectId: CAPY_MODULE_ID,
    module: 'capy',
    function: 'breed_and_keep',
    typeArguments: [],
    arguments: [
      CapyRegistryID,
      capy1,
      capy2,
    ],
    gasBudget,
  });
  console.log('tx', JSON.stringify(tx, null, 2));
  return (tx as any).EffectsCert.effects.effects.created![0].reference.objectId;
}

// add metadata
async function add_meta(
  footballModuleId: string,
  metaStoreId:string,
  medalId: string,
  name: string,
  description: string,
  url: string,
): Promise<void> {
  const tx = await signer.executeMoveCallWithRequestType({
    packageObjectId: footballModuleId,
    module: 'suia_football_capy',
    function: 'add_meta',
    typeArguments: [],
    arguments: [
      metaStoreId,
      medalId,
      name,
      description,
      url,
    ],
    gasBudget,
  });
  console.log('tx', JSON.stringify(tx, null, 2));
}

async function claim_football_suia_capy(
  footballModuleId: string,
  metaStoreId:string,
  capyId: string,
  medalId: string,
  suiaId: string,
): Promise<string> {
  const tx = await signer.executeMoveCallWithRequestType({
    packageObjectId: footballModuleId,
    module: 'suia_football_capy',
    function: 'claim_football_suia_capy',
    typeArguments: [],
    arguments: [
      metaStoreId,
      capyId,
      medalId,
      suiaId,
    ],
    gasBudget,
  });
  console.log('tx', JSON.stringify(tx, null, 2));
  return (tx as any).EffectsCert.effects.effects.created![0].reference.objectId;
}

async function main() {
  console.log('-----start-----');
  const addr = await signer.getAddress();
  console.log(`address: 0x${addr}`);
  const objs = await provider.getObjectsOwnedByAddress('0x' + addr);
  console.log(`objects of ${addr} are ${JSON.stringify(objs, null, 2)}`);
  // breed new capy
  const capies = objs.filter(obj => obj.type === `${CAPY_MODULE_ID}::capy::Capy`);
  let capy1Id;
  let capy2Id;
  if (capies.length < 2) {
    capy1Id = await eden_breed_capy();
    capy2Id = await eden_breed_capy();
  } else {
    capy1Id = capies[0].objectId;
    capy2Id = capies[1].objectId;
  }
  const capyId = await capy_breed_and_keep(capy1Id, capy2Id);
  console.log(`capyId: ${capyId}`);
  // claim football suia
  const footballSuiaId = '0xbb2686f6607f10dbec41d654e6968ce8c9bce254';
  const suiaModuleId = '0x81afd6832d2ae685a221bf464b89544b7ab852ac';
  // TODO: check football medal id
  const personalFootballSuiaIds = objs.filter(obj => obj.type === `${suiaModuleId}::suia::PersonalMedal`);
  let personalFootballSuiaId;
  if (personalFootballSuiaIds.length === 0) {
    personalFootballSuiaId = await claim(suiaModuleId, footballSuiaId);
  } else {
    personalFootballSuiaId = personalFootballSuiaIds[0].objectId;
  }
  console.log('personalFootballSuiaId', personalFootballSuiaId);
  // publish
  const publishResult = await publish();
  console.log('publishResult', JSON.stringify(publishResult, null, 2));
  const {packageId: footballCapyModuleId, objectId: footballSuiaCapyMetaObjectId} = publishResult;
  // add meta
  await add_meta(footballCapyModuleId, footballSuiaCapyMetaObjectId, footballSuiaId, 'Football Suia Capy', 'Football Suia Capy Description', 'https://i.imgur.com/2IeReRS.png');
  // claim football suia capy
  const footballSuiaCapyId = await claim_football_suia_capy(footballCapyModuleId, footballSuiaCapyMetaObjectId, capyId, footballSuiaId, personalFootballSuiaId);
  console.log('footballSuiaCapyId', footballSuiaCapyId);
  console.log('-----end-----');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`error: ${error.stack}`);
    process.exit(1);
  });
