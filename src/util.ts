import {
  Commitment,
  ComputeBudgetProgram,
  Connection,
  Finality,
  Keypair,
  PublicKey,
  SendTransactionError,
  Transaction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
  VersionedTransactionResponse,
} from "@solana/web3.js";
import { PriorityFee, TransactionResult } from "./types";

export const DEFAULT_COMMITMENT: Commitment = "confirmed";
export const DEFAULT_FINALITY: Finality = "finalized";

export const calculateWithSlippageBuy = (
  amount: bigint,
  basisPoints: bigint
) => {
  return amount + (amount * basisPoints) / 10000n;
};

export const calculateWithSlippageSell = (
  amount: bigint,
  basisPoints: bigint
) => {
  return amount - (amount * basisPoints) / 10000n;
};

export async function sendTx(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  signers: Keypair[],
  priorityFees?: PriorityFee | null,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY,
  simulate: boolean = false,
): Promise<TransactionResult> {
  let newTx = new Transaction();

  if (priorityFees) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: priorityFees.unitLimit,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFees.unitPrice,
    });
    newTx.add(modifyComputeUnits);
    newTx.add(addPriorityFee);
  }

  newTx.add(tx);

  let versionedTx = await buildVersionedTx(connection, payer, newTx, commitment);
  versionedTx.sign(signers);

  if (simulate) {
    const simulationResult = await connection.simulateTransaction(versionedTx, { commitment });
    console.log("simulationResult", simulationResult)
    if (simulationResult?.value?.err) {
      return simulationResult
    }
    return simulationResult
  }

  try {
    const { blockhash } = await connection.getLatestBlockhash();
    versionedTx.message.recentBlockhash = blockhash;
    const sig = await connection.sendTransaction(versionedTx, {
      skipPreflight: false,
    });
    console.log("sig:", `https://solscan.io/tx/${sig}`);

    let txResult = await getTxDetails(connection, sig, commitment, finality);
    if (!txResult) {
      return {
        success: false,
        error: "Transaction failed",
      };
    }
    return {
      success: true,
      signature: sig,
      results: txResult,
    };
  } catch (e) {
    if (e instanceof SendTransactionError) {
      let ste = e as SendTransactionError;
      console.log("SendTransactionError" + await ste.getLogs(connection));
    } else {
      console.error(e);
    }
    throw e;
  }
}

const pollTransactionConfirmation = (txtSig: TransactionSignature, connection: Connection): Promise<TransactionSignature> => {
  // 15 second timeout
  const timeout = 15000;
  // 5 second retry interval
  const interval = 5000;
  let elapsed = 0;

  return new Promise<TransactionSignature>((resolve, reject) => {
    const intervalId = setInterval(async () => {
      elapsed += interval;

      if (elapsed >= timeout) {
        clearInterval(intervalId);
        reject(new Error(`Transaction ${txtSig}'s confirmation timed out`));
      }

      const status = await connection.getSignatureStatuses([txtSig]);

      if (status?.value[0]?.confirmationStatus === "confirmed") {
        clearInterval(intervalId);
        resolve(txtSig);
      }
    }, interval);
  });
}

export async function sendVersionTx(
  connection: Connection,
  versionedTx: VersionedTransaction,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY,
  simulate: boolean = false,
): Promise<TransactionResult> {

  if (simulate) {
    const simulationResult = await connection.simulateTransaction(versionedTx, { commitment });
    console.log("simulationResult", simulationResult)
    if (simulationResult?.value?.err) {
      return simulationResult;
    }
    return simulationResult;
  }

  try {
    const sig = await connection.sendTransaction(versionedTx, {
      skipPreflight: false,
    });
    console.log("sig:", `https://solscan.io/tx/${sig}`);

    return await this.pollTransactionConfirmation(sig, connection);

  } catch (e) {
    throw new Error(`Error sending transaction: ${e}`);
  }
}

export const buildVersionedTx = async (
  connection: Connection,
  payer: PublicKey,
  tx: Transaction,
  commitment: Commitment = DEFAULT_COMMITMENT
): Promise<VersionedTransaction> => {
  const blockHash = (await connection.getLatestBlockhash(commitment))
    .blockhash;

  let messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockHash,
    instructions: tx.instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

export const getTxDetails = async (
  connection: Connection,
  sig: string,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<VersionedTransactionResponse | null> => {
  const latestBlockHash = await connection.getLatestBlockhash();
  const data = await connection.confirmTransaction(
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: sig,
    },
    commitment
  );

  return connection.getTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: finality,
  });
};
