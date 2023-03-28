import {
  RawSigner,
  SuiObjectChangeCreated,
  SuiObjectChangePublished,
  TransactionBlock,
} from "@mysten/sui.js";
import { connection, provider, publish, sendTx, signer } from "./common";
import * as path from "path";

interface PublishResult {
  medalModuleId: string;
  medalStoreId: string;
}

let tx = new TransactionBlock();

async function interact_with_medal(
  publishResult: PublishResult,
  signer: RawSigner
) {
  // create medal
  const { medalModuleId, medalStoreId } = publishResult;
  const addr = await signer.getAddress();
  tx = new TransactionBlock();
  tx.moveCall({
    target: `${medalModuleId}::suia::create_medal`,
    arguments: [
      tx.object(medalStoreId),
      tx.pure("Car"),
      tx.pure("Car Description"),
      tx.pure("100"),
      tx.pure([addr]),
      tx.pure(
        "https://api.nodes.guru/wp-content/uploads/2021/12/0pD8rO18_400x400.jpg"
      ),
    ],
  });
  const createMedalTxn = await sendTx(tx, signer);
  console.log("createMedalTxn", JSON.stringify(createMedalTxn, null, 2));
  const medalId = (
    createMedalTxn.objectChanges!.filter(
      (o) => o.type === "created" && o.objectType.endsWith("::suia::Medal")
    )[0] as SuiObjectChangeCreated
  ).objectId;
  // claim medal
  tx = new TransactionBlock();
  tx.moveCall({
    target: `${medalModuleId}::suia::claim_medal`,
    typeArguments: [],
    arguments: [tx.object(medalId)],
  });
  const claimMedalTxn = await sendTx(tx, signer);
  console.log("claimMedalTxn", JSON.stringify(claimMedalTxn, null, 2));
}

// medalModuleId and medalStoreId should be app config
// userAddr should come from plugin wallet
async function queries(
  medalModuleId: string,
  medalStoreId: string,
  userAddr: string
) {
  const medalStore = await provider.getObject({
    id: medalStoreId,
    options: {
      showType: true,
      showContent: true,
      showDisplay: true,
    },
  });
  console.log(`medalStore: ${JSON.stringify(medalStore, null, 2)}`);
  const medalsTableID = (medalStore.data!.content! as any).fields.medals.fields
    .id.id;
  console.log(`medalsTableID: ${medalsTableID}`);
  const medals = await provider.getDynamicFields({
    parentId: medalsTableID,
  });
  console.log(`medals: ${JSON.stringify(medals, null, 2)}`);
  // query medal details, this data can be cached by frontend
  const cachedMedalDetails: any = {};
  for (const medal of medals.data) {
    const medalIdDetail = await provider.getObject({
      id: medal.objectId,
      options: {
        showContent: true,
      },
    });
    console.log(`medalIdDetail: ${JSON.stringify(medalIdDetail, null, 2)}`);
    const medalId = (medalIdDetail as any).data.content.fields.value;
    const medalDetail = await provider.getObject({
      id: medalId,
      options: {
        showContent: true,
        showType: true,
        showDisplay: true,
      },
    });
    console.log(`medalDetail: ${JSON.stringify(medalDetail, null, 2)}`);
    cachedMedalDetails[medalId] = medalDetail.data;
  }
  // query user medal gallery
  const userMedals = await provider.getOwnedObjects({
    owner: userAddr,
    filter: {
      StructType: `${medalModuleId}::suia::PersonalMedal`,
    },
    options: {
      showType: true,
      showDisplay: true,
      showContent: true,
    },
  });
  console.log(`userMedals: ${JSON.stringify(userMedals, null, 2)}`);
  console.log(
    `cachedMedalDetails: ${JSON.stringify(cachedMedalDetails, null, 2)}`
  );
  for (const medal of userMedals.data) {
    const personalMedal = await provider.getObject({
      id: medal.data!.objectId,
      options: {
        showType: true,
        showDisplay: true,
        showContent: true,
      },
    });
    console.log(`personalMedal: ${JSON.stringify(personalMedal, null, 2)}`);
    const medalDetail =
      cachedMedalDetails[(personalMedal.data as any).content.fields.medal];
    console.log(`userMedalDetail: ${JSON.stringify(medalDetail, null, 2)}`);
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
  const medalModuleId = (
    publishTxn.objectChanges!.filter(
      (o) => o.type === "published"
    )[0] as SuiObjectChangePublished
  ).packageId;
  const medalStoreId = (
    publishTxn.objectChanges!.filter(
      (o) => o.type === "created" && o.objectType.endsWith("::suia::MedalStore")
    )[0] as SuiObjectChangeCreated
  ).objectId;
  const publishResult = {
    medalModuleId,
    medalStoreId,
  };
  // let publishResult = {
  //   "medalModuleId": "0x4ae4e01a3f9265c03eb6e11d912fdbd6a8ee45519998a4807452c04cf4c2314f",
  //   "medalStoreId": "0xebfe060b6b4297ce7eb2b76d8caba21fe99d7941687073a256906f95bf10bc69"
  // };
  // const { medalModuleId, medalStoreId } = publishResult;
  console.log(`PublishResult: ${JSON.stringify(publishResult, null, 2)}`);

  // txs
  await interact_with_medal(publishResult, signer);

  await queries(medalModuleId, medalStoreId, addr);
  console.log("-----end-----");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`error: ${error.stack}`);
    process.exit(1);
  });
