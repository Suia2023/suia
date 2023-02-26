import {Connection, Ed25519Keypair, JsonRpcProvider, RawSigner} from '@mysten/sui.js';
import * as fs from 'fs';
require('dotenv').config()

const connection = new Connection({
  fullnode: process.env.SUI_RPC_URL!,
  faucet: process.env.FAUCET_URL,
});
let provider = new JsonRpcProvider(connection);
const keypairseed = process.env.KEY_PAIR_SEED;
// seed 32 bytes, private key 64 bytes
const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(keypairseed!, 'hex')));
const signer = new RawSigner( keypair, provider );

const gasBudget = 100000;

interface PublishResult {
  moduleId: string,
  showcaseConfigId: string,
}

async function publish(): Promise<PublishResult> {
  const compiledModules = [fs.readFileSync('packages/suia/build/MyNFT/bytecode_modules/showcase.mv', {encoding: 'base64'})];
  const publishTxn = await signer.publish({
    compiledModules,
    gasBudget,
  });
  console.log('publishTxn', JSON.stringify(publishTxn, null, 2));
  const newObjectEvent = (publishTxn as any).effects.effects.events.filter((e: any) => e.newObject !== undefined)[0].newObject;
  console.log('newObjectEvent', JSON.stringify(newObjectEvent, null, 2));
  const moduleId = newObjectEvent.packageId;
  const showcaseConfigId = newObjectEvent.objectId;
  return {
    moduleId,
    showcaseConfigId,
  }
}

async function interact(params: PublishResult) {
  // add layout
  const { moduleId, showcaseConfigId } = params;
  const addLayoutTx = await signer.executeMoveCall({
    packageObjectId: moduleId,
    module: 'showcase',
    function: 'add_layout',
    typeArguments: [],
    arguments: [
      showcaseConfigId,
      '9-box grid',
      '9',
    ],
    gasBudget,
  });
  console.log('addLayoutTx', JSON.stringify(addLayoutTx));
  // create showcase
  const createShowcaseTx = await signer.executeMoveCall({
    packageObjectId: moduleId,
    module: 'showcase',
    function: 'create_showcase',
    typeArguments: [],
    arguments: [
      showcaseConfigId,
      'my suia space',
      '9-box grid',
    ],
    gasBudget,
  });
  console.log('createShowcaseTx', JSON.stringify(createShowcaseTx, null, 2));
  const showcaseId = (createShowcaseTx as any).effects.effects.events.filter((e: any) => e.newObject?.objectType === `${moduleId}::showcase::Showcase`)[0].newObject.objectId;
  // add_nft_to_showcase
  const addr = await signer.getAddress();
  const objs = await provider.getObjectsOwnedByAddress('0x' + addr);
  // console.log(`objects of ${addr} are ${JSON.stringify(objs, null, 2)}`);
  // nfts
  let nfts = [];
  const nft_filters = [
    'suia_capy::SuiaCapy',
    // 'capy::Capy',
    'suia::PersonalMedal',
  ];
  let num = 2;
  for (let obj of objs) {
    if(num <= 0) {
      break
    }
    let use = false;
    for (let nft_filter of nft_filters) {
      console.log(obj.type);
      if(obj.type.endsWith(nft_filter)){
        use = true;
        break;
      }
    }
    if(!use){
      continue;
    }
    const res = await provider.getObject(obj.objectId)
    console.log(`id: ${obj.objectId}, type: ${obj.type}, status: ${res.status}`)
    if(res.status === 'Exists') {
      num--;
      nfts.push({objectId: obj.objectId, type: obj.type})
    }
  }
  console.log('nfts', JSON.stringify(nfts, null, 2));

  const addNftTx = await signer.executeMoveCall({
    packageObjectId: moduleId,
    module: 'showcase',
    function: 'add_nft_to_showcase',
    typeArguments: [
      nfts[0].type,
    ],
    arguments: [
      showcaseConfigId,
      showcaseId,
      nfts[0].objectId,
      '0',
    ],
    gasBudget,
  });
  console.log('addNftTx', JSON.stringify(addNftTx));

  const addNftTx1 = await signer.executeMoveCall({
    packageObjectId: moduleId,
    module: 'showcase',
    function: 'add_nft_to_showcase',
    typeArguments: [
      nfts[1].type,
    ],
    arguments: [
      showcaseConfigId,
      showcaseId,
      nfts[1].objectId,
      '1',
    ],
    gasBudget,
  });
  console.log('addNftTx1', JSON.stringify(addNftTx1));

  // extract_from_showcase
  const extractNftTx = await signer.executeMoveCall({
    packageObjectId: moduleId,
    module: 'showcase',
    function: 'extract_from_showcase',
    typeArguments: [
      nfts[1].type,
    ],
    arguments: [
      showcaseId,
      '1',
    ],
    gasBudget,
  });
  console.log('extractNftTx', JSON.stringify(extractNftTx));
}

async function queries(moduleId: string, showcaseConfigId: string, userAddr: string) {
  // config
  const config = await provider.getObject(showcaseConfigId);
  console.log(`config: ${JSON.stringify(config, null, 2)}`);
  // get user's showcase
  const objects = await provider.getObjectsOwnedByAddress(userAddr)
  let showcaseObjId = "";
  for (const obj of objects) {
    if(obj.type === `${moduleId}::showcase::Showcase`) {
      showcaseObjId = obj.objectId;
      break;
    }
  }
  // showcase
  const showcase = await provider.getObject(showcaseObjId);
  console.log("showcase", JSON.stringify(showcase, null, 2));
  // get nfts in showcase
  const nfts = await provider.getDynamicFields(showcaseObjId);
  console.log('nfts', JSON.stringify(nfts, null, 2));
  // show details of the nfts
  for (const nft of nfts.data) {
    const nftObj = await provider.getDynamicFieldObject(showcaseObjId, nft.name);
    console.log('nft', JSON.stringify(nftObj, null, 2))
  }
}

async function main() {
  console.log('-----start-----');
  const addr = await signer.getAddress();
  console.log(`address: 0x${addr}`);
  const objs = await provider.getObjectsOwnedByAddress('0x' + addr);
  console.log(`objects of ${addr} are ${JSON.stringify(objs, null, 2)}`);
  if (connection.faucet && objs.length == 0) {
    const res = await provider.requestSuiFromFaucet(addr);
    console.log('requestSuiFromFaucet', JSON.stringify(res, null, 2));
  }

  const publishResult = await publish();
  console.log(`PublishResult: ${JSON.stringify(publishResult, null, 2)}`);
  await interact(publishResult);
  const { moduleId, showcaseConfigId } = publishResult;
  await queries(moduleId, showcaseConfigId, addr);
  console.log('-----end-----');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`error: ${error.stack}`);
    process.exit(1);
  });
