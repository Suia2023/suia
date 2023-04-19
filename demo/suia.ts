import {
  bcs,
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

function generateRandomAddress(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  return '0x' + Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function add_random_whitelist(
  medalModuleId: string,
  medalId: string,
  num: number,
  signer: RawSigner
) {
  const lists = [];
  const max = 500;
  while(num > max) {
    lists.push(max);
    num -= max;
  }
  if(num > 0) {
    lists.push(num);
  }
  for(const n of lists) {
    let whitelist = [];
    for(let i = 0; i < n; i++) {
      whitelist.push(generateRandomAddress());
    }
    console.log("whitelist", whitelist);
    tx = new TransactionBlock();
    const whitelistBytes = bcs.ser('vector<address>', whitelist, {maxSize: 1024 * 16}).toBytes();
    tx.moveCall({
      target: `${medalModuleId}::suia::add_medal_whitelist`,
      arguments: [
        tx.object(medalId),
        tx.pure(whitelistBytes),
      ]
    });
    const addMedalWhitelistTxn = await sendTx(tx, signer);
    console.log("addMedalWhitelistTxn", JSON.stringify(addMedalWhitelistTxn, null, 2));
  }
}

async function interact_with_medal(
  publishResult: PublishResult,
  signer: RawSigner
) {
  // create medal
  const { medalModuleId, medalStoreId } = publishResult;
  const addr = await signer.getAddress();
  tx = new TransactionBlock();
  const whitelist = [
    addr,
    "0x6228a1cb6829e0a7e76772bbeae1b990a4252c9e5c7d8a7d870102b7a950e527",
    "0x1998b8c32ea0b8d1102dca912b0bea67ccf5a793b739d378dde48cf6e1ae3579",
    "0xf24d302d5cc84a04be2596eae71e19e844a7a51d958dfc00077ffd1f52a9efad",
    "0xf0dbdec33a9bee08bccfdb92b789605be10c18977a7e9917db3cc94de360e588",
    "0xe6b19e17f75dd51cfc6770604bd56ee3161e7d5053b727872263014ea0c15bb9",
    "0x8fe23c7beefacf8ac12b871b4201cda4d59305541a7c306531a50bba3b2c5915",
    "0x833d7fe7d35ad6f43f078e7895482d1df73a146d2ea47f16599dc8a2a6de424f",
    "0xe3dc96437a5b5fdf3639775140b8f66be7ed6822f923fc0304c1ba14851c1b81",
    "0xd1144a2a818f736d1cbd5b7e837b6d0475c21d6741f13d363e0a50ec204a99a3",
    "0x719d3e9a5d3236173279cdf39d87f2c14309d1400ed8b389978238a9352a0b45",
    "0x54998cd0a97ddc6176def1b0c8fecc29d65c6018c870012aec6adc9a14531869",
    "0xd5ca8307f7df260af9c680a3a1e3147991ed028f68aa174130b553885d883164",
    "0x5d28ce8edc8d5d0328f022adc967075200d7066e80971e19f1cd00d1e133d021",
    "0x97e363acc8b7a96a96c569db06fa8d5ca2e2a78b7a079ded0889aa15a88208bf",
    "0xf15cb262e109214d7b7b99393cf192bb03f4a1c8dce8aa84c7eb45cb65edafa7",
    "0x40d23a71c67246544eb49bba32ccf2ca3053d8cdbd85a54fb9c35a6cf3ce4921",
    "0xa78b4b27d9bd97c4fdf319b421fc66be154f1e79c55b52bd9d3d589ed8b9350f",
    "0xd6777c5246a1a32e99496c4606d2da1af1c7ef93d9bc87412129bf51906e54ea",
    "0xc4052df6ec71e9a1bf0295c2bf03b642a5995039f4ce6399046421265f77679f",
    "0xd143d63a8387f28fe52b9e69e3063f4c1bc5ae308e6a5f70509049f08b1bf2cc",
    "0xe7535cc04f33a3a202092b6f6b1ad9b6fb072890c4d57bee654d774c59897c3e",
    "0x5fa6542b9b81b551c38d53c380931244ebefed8e5ca6f11da3f4bb088130931b",
    "0xd2313f21433681ec62c1949d45af7647e69fb062afbf607536e2a6093ac12e98",
    "0xb8024f97ad7418dbbbcaf8d58403d8062790dbd895e3db4ea480e9bf5738b3bc",
    "0x62b7a21ddfe2777f1e04d1f4383d6ce792953b656ee23445459f743c524b89dd",
    "0xf47fc171b3cbc100a3b2f3f04409caf9c806301e84dbb0a14a36fc936366b2c0",
    "0xd63ad6ae7190fc0e540ffbff100a1c76dbcd123fdc1bff42234b7b6ac56215ef",
    "0x6052170e5285266cc834325168025ff55c5c1db497be7d68b652c8e0331c1bc4",
    "0xfa50da9d98b087f966c28248b4ceb6ab2987e9dfdd4d605b59998b3aa174dad0",
    "0x9b88f420e1184067f77673e88d5bf4c2bb10cc2d13996da2e09643a794bf2bd7",
    "0x9c0d4f110935e26784e05b74bacbef0d3e04b97ae2125c49826bb84fa8f19aa4",
    "0xfed1098d8895f2ada803e151fd15768a5aac317e904d16e9abc1d069939e6d12",
    "0x747d0dc591250296ac932c311a7e250a8c02bbf915324be0f34481e3350a6ccc",
    "0x66e7f9f88d708611fc3b9171cc19c60fb1a3d68120000f761c362635494a1264",
    "0x01a8e02e54ba3f75f15881a2a2878cce651a65cbc74c2cf2cbe892b6222149f4",
    "0x279a1cf20cc78e27455b5d08e4b6adee8c457cd8efcd51e417c28bff61b35ec2",
    "0x5923be812dcaf49bb5a12a9059cbf3940f8335fef57d7c2d9b8d350e7a069567",
    "0x684df8d76e361a57678c785e2bd7495e4f6416c5d55c6e56c166685235466002",
    "0x5adc764a9485c6424697b829c9d0acc2dfefdf22e6b8bfdeae2cdb3d62c74797",
    "0x0865476b42cd768b5ed56144d52317476a3124009d975e0423d373278d319bae",
    "0x1c04fd26ad57bb09aaf98ed8c434142f206f4aa8538b18814b0f27a57301c9fb",
    "0xd5cd6efb8e9e548b3a940d9e298ca1633d50ae1e2c1abfea0b1632195c50a8ca",
    "0xda52cdf6f6fbe53c2e9894c3897a8193ec274e27620b6b8087045d3ec6ed0d67",
    "0x545edbc8d7d283ca70c4114bb0cbc6d2f8bde1b12f65558f3925f80fb8432514",
    "0xada9ceb8e3a802919ae91ac5bb0496816f62b3e2f271ebac2625f74b1223c979",
    "0x18ac9328f43593505ba6509bfe51977f5ea7e309937cad6885019d39486a1a35",
    "0x451e4eebb6f82f864b422b8bd11992fc1d823653c9aa8a900abd33195615e042",
    "0xa8ab6ef06e85e0ea5bb22e81a494ba8576e5da11d7d74a8825272052309d81b0",
    "0x0726e7afbfb9986f1334cddeae0a706ef8e0df4b999830796e4e8c64af994c36",
  ];
  const whitelistBytes = bcs.ser("vector<address>", whitelist, {maxSize: 16 * 1024}).toBytes();
  tx.moveCall({
    target: `${medalModuleId}::suia::create_medal`,
    arguments: [
      tx.object(medalStoreId),
      tx.pure("Car"),
      tx.pure("Car Description"),
      tx.pure("100"),
      tx.pure(whitelistBytes),
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
  // add whitelist
  await add_random_whitelist(medalModuleId, medalId, 501, signer);
  // tx = new TransactionBlock();
  // tx.moveCall({
  //   target: `${medalModuleId}::suia::add_medal_whitelist`,
  //   arguments: [
  //     tx.object(medalId),
  //     tx.pure(whiteList.slice(31, whiteList.length)),
  //   ]
  // });
  // const addMedalWhitelistTxn = await sendTx(tx, signer);
  // console.log("addMedalWhitelistTxn", JSON.stringify(addMedalWhitelistTxn, null, 2));
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
  // get coin from faucet
  const res = await provider.requestSuiFromFaucet(addr);
  console.log("requestSuiFromFaucet", JSON.stringify(res, null, 2));

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
  //   "medalModuleId": "0x720d1ffa40721b3d030be44723ed53ae1f89782591e3fe43136a14b9b0d8616c",
  //   "medalStoreId": "0x2e98895f5a9d9f24cd83a02a065e0b06c21031814f49f3bc1125ab74086917fc"
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
    console.error(`error: ${JSON.stringify(error, null, 2)}, ${error.stack}`);
    process.exit(1);
  });
