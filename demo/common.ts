import {
  normalizeSuiObjectId,
  SuiTransactionBlockResponse,
  Connection,
  Ed25519Keypair,
  fromB64,
  JsonRpcProvider,
  RawSigner,
  TransactionBlock,
  MoveCallTransaction, localnetConnection,
} from "@mysten/sui.js";
const { execSync } = require("child_process");
require("dotenv").config();

export const connection = new Connection({
  fullnode: process.env.SUI_RPC_URL!,
  faucet: process.env.FAUCET_URL,
});
// export const connection = devnetConnection;
// export const connection = localnetConnection;
export const provider = new JsonRpcProvider(connection);
const keypairseed = process.env.KEY_PAIR_SEED;
// seed 32 bytes, private key 64 bytes
const keypair = Ed25519Keypair.fromSecretKey(
  Uint8Array.from(Buffer.from(keypairseed!, "hex"))
);
export const signer = new RawSigner(keypair, provider);

export async function publish(
  packagePath: string,
  signer: RawSigner
): Promise<SuiTransactionBlockResponse> {
  const compiledModulesAndDeps = JSON.parse(
    execSync(`sui move build --dump-bytecode-as-base64 --path ${packagePath}`, {
      encoding: "utf-8",
    })
  );
  const tx = new TransactionBlock();
  const [upgradeCap] = tx.publish( {
      modules: compiledModulesAndDeps.modules.map((m: any) => Array.from(fromB64(m))),
      dependencies: compiledModulesAndDeps.dependencies.map((addr: string) => normalizeSuiObjectId(addr)),
    }
  );
  tx.transferObjects([upgradeCap], tx.pure(await signer.getAddress()));
  const publishTxn = await signer.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    options: {
      showInput: true,
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });
  console.log("publishTxn", JSON.stringify(publishTxn, null, 2));
  return publishTxn;
}

export async function sendTx(
  tx: TransactionBlock,
  signer: RawSigner
): Promise<SuiTransactionBlockResponse> {
  const txnRes = await signer.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    options: {
      showInput: true,
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });
  // console.log('txnRes', JSON.stringify(txnRes, null, 2));
  return txnRes;
}
