import { Commitment, Finality, Keypair, PublicKey, RpcResponseAndContext, SimulatedTransactionResponse, TransactionSignature, VersionedTransactionResponse } from "@solana/web3.js";

export type IBuyToken = {
  buyer: Keypair;
  mint: string;
  buyAmountSol: number;
  slippagePercentage: number;
  pool: "pump" | "raydium";
  priorityFees: PriorityFee | null;
  commitment?: Commitment;
  finality?: Finality;
  simulate?: boolean;
};

export type ISellToken = {
  seller: Keypair;
  mint: string;
  sellTokenAmount: number;
  slippagePercentage: number;
  pool: "pump" | "raydium";
  priorityFees: PriorityFee | null;
  commitment?: Commitment;
  finality?: Finality;
  simulate?: boolean;
}

export type CreateTokenMetadata = {
  name: string;
  symbol: string;
  description: string;
  file: Blob;
  twitter?: string;
  telegram?: string;
  website?: string;
};

export type TokenMetadata = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  showName: boolean;
  createdOn: string;
  twitter: string;
};

export type CreateEvent = {
  name: string;
  symbol: string;
  uri: string;
  mint: PublicKey;
  bondingCurve: PublicKey;
  user: PublicKey;
};

export type TradeEvent = {
  mint: PublicKey;
  solAmount: bigint;
  tokenAmount: bigint;
  isBuy: boolean;
  user: PublicKey;
  timestamp: number;
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
  realSolReserves: bigint;
  realTokenReserves: bigint;
};

export type CompleteEvent = {
  user: PublicKey;
  mint: PublicKey;
  bondingCurve: PublicKey;
  timestamp: number;
};

export type SetParamsEvent = {
  feeRecipient: PublicKey;
  initialVirtualTokenReserves: bigint;
  initialVirtualSolReserves: bigint;
  initialRealTokenReserves: bigint;
  tokenTotalSupply: bigint;
  feeBasisPoints: bigint;
};

export interface PumpFunEventHandlers {
  createEvent: CreateEvent;
  tradeEvent: TradeEvent;
  completeEvent: CompleteEvent;
  setParamsEvent: SetParamsEvent;
}

export type PumpFunEventType = keyof PumpFunEventHandlers;

export type PriorityFee = {
  unitLimit: number;
  unitPrice: number;
};

export type TransactionResult = | {
  signature?: string;
  error?: unknown;
  results?: VersionedTransactionResponse;
  success: boolean;
} | RpcResponseAndContext<SimulatedTransactionResponse> | TransactionSignature;
