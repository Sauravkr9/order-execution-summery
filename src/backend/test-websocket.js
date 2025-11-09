/**
 * WebSocket Test Client
 * 
 * This script connects to the Order Execution Engine WebSocket
 * and displays real-time order updates.
 * 
 * Usage: node test-websocket.js
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3000/ws';

console.log('🔌 Connecting to WebSocket...');
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('📡 Listening for order updates...\n');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'connected') {
      console.log('🎉', message.message);
      return;
    }

    // Format order update
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Order ID: ${message.orderId}`);
    console.log(`📊 Status: ${getStatusEmoji(message.status)} ${message.status.toUpperCase()}`);
    console.log(`⏰ Timestamp: ${new Date(message.timestamp).toLocaleString()}`);
    
    if (message.selectedDex) {
      console.log(`🏦 DEX: ${message.selectedDex}`);
    }
    
    if (message.quote) {
      console.log(`💰 Quote:`);
      console.log(`   Amount Out: ${message.quote.amountOut.toFixed(4)}`);
      console.log(`   Price Impact: ${message.quote.priceImpact.toFixed(2)}%`);
      console.log(`   Fee: ${message.quote.fee.toFixed(4)}`);
      console.log(`   Route: ${message.quote.route.join(' → ')}`);
    }
    
    if (message.txSignature) {
      console.log(`🔗 Transaction: ${message.txSignature}`);
      console.log(`   View on Solscan: https://solscan.io/tx/${message.txSignature}?cluster=devnet`);
    }
    
    if (message.errorMessage) {
      console.log(`❌ Error: ${message.errorMessage}`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');
  process.exit(0);
});

// Helper function to get emoji for status
function getStatusEmoji(status) {
  const emojis = {
    pending: '⏳',
    routing: '🔄',
    building: '🔨',
    submitted: '📤',
    confirmed: '✅',
    failed: '❌'
  };
  return emojis[status] || '❓';
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Closing WebSocket connection...');
  ws.close();
});
