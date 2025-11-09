import { DexQuote, DexType, OrderExecutionResult } from '../types';
import { config } from '../config';

export class MockDexRouter {
  private raydiumSuccessRate: number;
  private meteoraSuccessRate: number;
  private processingTimeMs: number;

  constructor() {
    this.raydiumSuccessRate = config.mock.raydiumSuccessRate;
    this.meteoraSuccessRate = config.mock.meteoraSuccessRate;
    this.processingTimeMs = config.mock.processingTimeMs;
  }

  async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    slippage: number
  ): Promise<DexQuote> {
    // Simulate network delay
    await this.delay(100);

    // Mock price calculation (random variation ±5%)
    const baseRate = 1.5 + (Math.random() - 0.5) * 0.1;
    const amountOut = amountIn * baseRate;
    const priceImpact = Math.random() * 2; // 0-2%
    const fee = amountIn * 0.003; // 0.3% fee

    return {
      dex: 'raydium',
      amountOut: amountOut - fee,
      priceImpact,
      fee,
      route: [tokenIn, tokenOut],
    };
  }

  async getMeteorQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    slippage: number
  ): Promise<DexQuote> {
    // Simulate network delay
    await this.delay(100);

    // Mock price calculation (slightly different from Raydium)
    const baseRate = 1.48 + (Math.random() - 0.5) * 0.1;
    const amountOut = amountIn * baseRate;
    const priceImpact = Math.random() * 1.5; // 0-1.5%
    const fee = amountIn * 0.0025; // 0.25% fee

    return {
      dex: 'meteora',
      amountOut: amountOut - fee,
      priceImpact,
      fee,
      route: [tokenIn, tokenOut],
    };
  }

  async getBestQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    slippage: number
  ): Promise<DexQuote> {
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amountIn, slippage),
      this.getMeteorQuote(tokenIn, tokenOut, amountIn, slippage),
    ]);

    // Select the quote with higher output
    return raydiumQuote.amountOut > meteoraQuote.amountOut
      ? raydiumQuote
      : meteoraQuote;
  }

  async executeSwap(
    dex: DexType,
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    quote: DexQuote,
    walletAddress: string
  ): Promise<OrderExecutionResult> {
    // Simulate transaction building and submission delay
    await this.delay(this.processingTimeMs);

    const successRate = dex === 'raydium' ? this.raydiumSuccessRate : this.meteoraSuccessRate;
    const success = Math.random() < successRate;

    if (success) {
      // Generate mock transaction signature
      const txSignature = this.generateMockTxSignature();
      return {
        success: true,
        txSignature,
      };
    } else {
      return {
        success: false,
        errorMessage: `Mock ${dex} execution failed: Simulated network error`,
      };
    }
  }

  private generateMockTxSignature(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let signature = '';
    for (let i = 0; i < 88; i++) {
      signature += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return signature;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
