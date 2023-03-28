import {
  Connection,
  devnetConnection,
  Ed25519Keypair,
  fromB64,
  JsonRpcProvider,
  RawSigner,
  TransactionBlock,
  SuiObjectChangeCreated,
  SuiObjectChangePublished,
} from "@mysten/sui.js";
import { connection, provider, publish, sendTx, signer } from "./common";
import * as path from "path";

interface PublishResult {
  moduleId: string;
  showcaseConfigId: string;
}

async function interact(params: PublishResult) {
  // add layout
  const { moduleId, showcaseConfigId } = params;
  let tx = new TransactionBlock();
  tx.moveCall({
    target: `${moduleId}::showcase::add_layout`,
    typeArguments: [],
    arguments: [
      tx.object(showcaseConfigId),
      tx.pure("9-box grid"),
      tx.pure("9"),
    ],
  });
  const addLayoutTx = await sendTx(tx, signer);
  console.log("addLayoutTx", JSON.stringify(addLayoutTx));
  // create showcase
  tx = new TransactionBlock();
  tx.moveCall({
    target: `${moduleId}::showcase::create_showcase`,
    typeArguments: [],
    arguments: [
      tx.object(showcaseConfigId),
      tx.pure("my suia space"),
      tx.pure("my suia space description"),
      tx.pure("my suia space url"),
      tx.pure("9-box grid"),
    ],
  });
  const createShowcaseTx = await sendTx(tx, signer);
  console.log("createShowcaseTx", JSON.stringify(createShowcaseTx, null, 2));
  const showcaseId = (
    createShowcaseTx.objectChanges!.filter(
      (o) =>
        o.type === "created" && o.objectType.endsWith("::showcase::Showcase")
    )[0] as SuiObjectChangeCreated
  ).objectId;

  // create 2 test nft
  tx = new TransactionBlock();
  tx.moveCall({
    target: `${moduleId}::test_nft::claim`,
    arguments: [
      tx.pure("TestNFT1"),
      tx.pure("TestNFT1 Description"),
      tx.pure("https://image.com/test_nft_1.png"),
    ],
  });
  tx.moveCall({
    target: `${moduleId}::test_nft::claim`,
    arguments: [
      tx.pure("TestNFT2"),
      tx.pure("TestNFT2 Description"),
      tx.pure("https://image.com/test_nft_2.png"),
    ],
  });
  const createTestNftTx = await sendTx(tx, signer);
  console.log("createTestNftTx", JSON.stringify(createTestNftTx, null, 2));
  const nftsRes = createTestNftTx.objectChanges!.filter(
    (o) =>
      o.type === "created" && o.objectType.endsWith("::test_nft::SuiaTestNFT")
  ) as SuiObjectChangeCreated[];
  console.log("nftsRes", JSON.stringify(nftsRes, null, 2));
  const nfts = nftsRes.map((o) => o.objectId);
  console.log("nfts", JSON.stringify(nfts, null, 2));

  // const addr = await signer.getAddress();
  // const objs = await provider.getOwnedObjects({
  //   owner: addr,
  //   filter: {
  //     StructType: suiaTestNftType,
  //   },
  //   options: {
  //     showType: true,
  //     showOwner: true,
  //   },
  // });
  // console.log(`objects of ${addr} are ${JSON.stringify(objs, null, 2)}`);
  // const nfts = objs.data.map(o => o.data!.objectId);
  // console.log('nfts', JSON.stringify(nfts, null, 2));

  // add_nft_to_showcase
  const suiaTestNftType = `${moduleId}::test_nft::SuiaTestNFT`;
  tx = new TransactionBlock();
  tx.moveCall({
    target: `${moduleId}::showcase::add_nft_to_showcase`,
    typeArguments: [suiaTestNftType],
    arguments: [
      tx.object(showcaseConfigId),
      tx.object(showcaseId),
      tx.object(nfts[0]),
      tx.pure("0"),
    ],
  });
  const addNftTx = await sendTx(tx, signer);
  console.log("addNftTx", JSON.stringify(addNftTx, null, 2));

  tx = new TransactionBlock();
  tx.moveCall({
    target: `${moduleId}::showcase::add_nft_to_showcase`,
    typeArguments: [suiaTestNftType],
    arguments: [
      tx.object(showcaseConfigId),
      tx.object(showcaseId),
      tx.object(nfts[1]),
      tx.pure("1"),
    ],
  });
  const addNftTx1 = await sendTx(tx, signer);
  console.log("addNftTx1", JSON.stringify(addNftTx1));

  // extract_from_showcase
  tx = new TransactionBlock();
  tx.moveCall({
    target: `${moduleId}::showcase::extract_from_showcase`,
    typeArguments: [suiaTestNftType],
    arguments: [tx.object(showcaseId), tx.pure("1")],
  });
  const extractNftTx = await sendTx(tx, signer);
  console.log("extractNftTx", JSON.stringify(extractNftTx));
}

async function queries(
  moduleId: string,
  showcaseConfigId: string,
  userAddr: string
) {
  // config
  const config = await provider.getObject({
    id: showcaseConfigId,
    options: {
      showContent: true,
    },
  });
  console.log(`config: ${JSON.stringify(config, null, 2)}`);
  // get user's showcase
  const showcases = await provider.getOwnedObjects({
    owner: userAddr,
    filter: {
      StructType: `${moduleId}::showcase::Showcase`,
    },
    options: {
      showType: true,
      showContent: true,
      showDisplay: true,
    },
  });
  console.log("showcases", JSON.stringify(showcases, null, 2));
  // get nfts in showcase
  const showcaseBagId = (showcases.data[0] as any).data.content.fields.nfts
    .fields.id.id;
  console.log("showcaseBagId", showcaseBagId);
  const nfts = await provider.getDynamicFields({
    parentId: showcaseBagId,
  });
  console.log("nfts", JSON.stringify(nfts, null, 2));
  // show details of the nfts
  for (const nft of nfts.data) {
    const nftObj = await provider.getDynamicFieldObject({
      parentId: showcaseBagId,
      name: nft.name,
    });
    console.log("nft", JSON.stringify(nftObj, null, 2));
  }
}

async function main() {
  console.log("-----start-----");
  const addr = await signer.getAddress();
  console.log(`address: ${addr}`);
  const objs = await provider.getCoins({
    owner: addr,
  });
  console.log(`objects of ${addr} are ${JSON.stringify(objs, null, 2)}`);
  if (connection.faucet && objs.data.length == 0) {
    const res = await provider.requestSuiFromFaucet(addr);
    console.log("requestSuiFromFaucet", JSON.stringify(res, null, 2));
  }

  // publish
  const publishTxn = await publish(
    path.join(__dirname, "../packages/suia"),
    signer
  );
  const moduleId = (
    publishTxn.objectChanges!.filter(
      (o) => o.type === "published"
    )[0] as SuiObjectChangePublished
  ).packageId;
  const showcaseConfigId = (
    publishTxn.objectChanges!.filter(
      (o) => o.type === "created" && o.objectType.endsWith("::showcase::Config")
    )[0] as SuiObjectChangeCreated
  ).objectId;
  const publishResult = {
    moduleId,
    showcaseConfigId,
  };
  console.log(`PublishResult: ${JSON.stringify(publishResult, null, 2)}`);
  // const publishResult = {
  //   "moduleId": "0x2f21a8dfc0d522dfb8ae21daf2e5c333ee49a3fa12939a139bdf1ee592d9aff3",
  //   "showcaseConfigId": "0xdb2f3262e23f467b3660aa63cfc902404447f7d7e9c95aabb86b0115f9c5f3a1"
  // }
  // const { moduleId, showcaseConfigId } = publishResult;
  await interact(publishResult);
  await queries(moduleId, showcaseConfigId, addr);
  console.log("-----end-----");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`error: ${error.stack}`);
    process.exit(1);
  });
