export type OrderType = 'market' | 'limit';
export type OrderStatus = 'pending' | 'routing' | 'building' | 'submitted' | 'confirmed' | 'failed';
export type DexType = 'raydium' | 'meteora';

export interface OrderRequest {
  walletAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  orderType: OrderType;
  slippage: number;
  limitPrice?: number;
}

export interface Order extends OrderRequest {
  orderId: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  selectedDex?: DexType;
  quote?: DexQuote;
  txSignature?: string;
  errorMessage?: string;
  retryCount: number;
}

export interface DexQuote {
  dex: DexType;
  amountOut: number;
  priceImpact: number;
  fee: number;
  route: string[];
}

export interface WebSocketMessage {
  orderId: string;
  status: OrderStatus;
  timestamp: Date;
  quote?: DexQuote;
  txSignature?: string;
  errorMessage?: string;
  selectedDex?: DexType;
}

export interface OrderExecutionResult {
  success: boolean;
  txSignature?: string;
  errorMessage?: string;
}
