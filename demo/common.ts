import {
  normalizeSuiObjectId,
  SuiTransactionBlockResponse,
  Connection,
  Ed25519Keypair,
  fromB64,
  JsonRpcProvider,
  RawSigner,
  TransactionBlock,
} from "@mysten/sui.js";
import { MoveCallTransaction } from "@mysten/sui.js/src/builder/Transactions";
const { execSync } = require("child_process");
require("dotenv").config();

export const connection = new Connection({
  fullnode: process.env.SUI_RPC_URL!,
  faucet: process.env.FAUCET_URL,
});
// const connection = devnetConnection;
export const provider = new JsonRpcProvider(connection);
const keypairseed = process.env.KEY_PAIR_SEED;
// seed 32 bytes, private key 64 bytes
const keypair = Ed25519Keypair.fromSecretKey(
  Uint8Array.from(Buffer.from(keypairseed!, "hex"))
);
export const signer = new RawSigner(keypair, provider);
export const gasBudget = 100000;

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
  const [upgradeCap] = tx.publish(
    compiledModulesAndDeps.modules.map((m: any) => Array.from(fromB64(m))),
    compiledModulesAndDeps.dependencies.map((addr: string) =>
      normalizeSuiObjectId(addr)
    )
  );
  tx.transferObjects([upgradeCap], tx.pure(await signer.getAddress()));
  tx.setGasBudget(gasBudget);
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
  tx.setGasBudget(gasBudget);
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
