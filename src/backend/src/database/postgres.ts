import { Pool } from 'pg';
import { config } from '../config';
import { Order } from '../types';

export class PostgresClient {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
    });
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          order_id VARCHAR(255) PRIMARY KEY,
          wallet_address VARCHAR(255) NOT NULL,
          token_in VARCHAR(255) NOT NULL,
          token_out VARCHAR(255) NOT NULL,
          amount_in NUMERIC NOT NULL,
          order_type VARCHAR(50) NOT NULL,
          slippage NUMERIC NOT NULL,
          limit_price NUMERIC,
          status VARCHAR(50) NOT NULL,
          selected_dex VARCHAR(50),
          quote JSONB,
          tx_signature VARCHAR(255),
          error_message TEXT,
          retry_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_wallet ON orders(wallet_address);
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      `);
      console.log('PostgreSQL tables initialized');
    } finally {
      client.release();
    }
  }

  async saveOrder(order: Order): Promise<void> {
    const query = `
      INSERT INTO orders (
        order_id, wallet_address, token_in, token_out, amount_in,
        order_type, slippage, limit_price, status, selected_dex,
        quote, tx_signature, error_message, retry_count, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (order_id) DO UPDATE SET
        status = EXCLUDED.status,
        selected_dex = EXCLUDED.selected_dex,
        quote = EXCLUDED.quote,
        tx_signature = EXCLUDED.tx_signature,
        error_message = EXCLUDED.error_message,
        retry_count = EXCLUDED.retry_count,
        updated_at = EXCLUDED.updated_at
    `;

    await this.pool.query(query, [
      order.orderId,
      order.walletAddress,
      order.tokenIn,
      order.tokenOut,
      order.amountIn,
      order.orderType,
      order.slippage,
      order.limitPrice || null,
      order.status,
      order.selectedDex || null,
      order.quote ? JSON.stringify(order.quote) : null,
      order.txSignature || null,
      order.errorMessage || null,
      order.retryCount,
      order.createdAt,
      order.updatedAt,
    ]);
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const result = await this.pool.query(
      'SELECT * FROM orders WHERE order_id = $1',
      [orderId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      orderId: row.order_id,
      walletAddress: row.wallet_address,
      tokenIn: row.token_in,
      tokenOut: row.token_out,
      amountIn: parseFloat(row.amount_in),
      orderType: row.order_type,
      slippage: parseFloat(row.slippage),
      limitPrice: row.limit_price ? parseFloat(row.limit_price) : undefined,
      status: row.status,
      selectedDex: row.selected_dex,
      quote: row.quote ? JSON.parse(row.quote) : undefined,
      txSignature: row.tx_signature,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
