/**
 * API Test Script
 * 
 * This script tests the Order Execution Engine API endpoints
 * 
 * Usage: node test-api.js
 */

const API_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check passed:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function submitOrder(orderData) {
  console.log('\n📤 Submitting Order...');
  try {
    const response = await fetch(`${API_URL}/api/orders/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Order submitted successfully:');
      console.log('   Order ID:', data.orderId);
      console.log('   Status:', data.status);
      return data.orderId;
    } else {
      console.error('❌ Order submission failed:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error submitting order:', error.message);
    return null;
  }
}

async function getOrderStatus(orderId) {
  console.log(`\n🔍 Fetching Order Status for ${orderId}...`);
  try {
    const response = await fetch(`${API_URL}/api/orders/${orderId}`);
    
    if (!response.ok) {
      console.error('❌ Order not found');
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Order Status:');
    console.log('   Status:', data.status);
    console.log('   Wallet:', data.walletAddress);
    console.log('   Token In:', data.tokenIn);
    console.log('   Token Out:', data.tokenOut);
    console.log('   Amount In:', data.amountIn);
    console.log('   Order Type:', data.orderType);
    
    if (data.selectedDex) {
      console.log('   Selected DEX:', data.selectedDex);
    }
    
    if (data.quote) {
      console.log('   Quote:');
      console.log('     Amount Out:', data.quote.amountOut);
      console.log('     Price Impact:', data.quote.priceImpact + '%');
      console.log('     Fee:', data.quote.fee);
    }
    
    if (data.txSignature) {
      console.log('   Transaction:', data.txSignature);
    }
    
    if (data.errorMessage) {
      console.log('   Error:', data.errorMessage);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching order:', error.message);
    return null;
  }
}

async function getQueueMetrics() {
  console.log('\n📊 Fetching Queue Metrics...');
  try {
    const response = await fetch(`${API_URL}/api/orders`);
    const data = await response.json();
    console.log('✅ Queue Metrics:');
    console.log('   Waiting:', data.waiting);
    console.log('   Active:', data.active);
    console.log('   Completed:', data.completed);
    console.log('   Failed:', data.failed);
    console.log('   Total:', data.total);
    return data;
  } catch (error) {
    console.error('❌ Error fetching metrics:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Test 1: Health Check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Health check failed. Is the server running?');
    return;
  }
  
  // Test 2: Submit Market Order
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const marketOrderData = {
    walletAddress: '6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez',
    tokenIn: 'So11111111111111111111111111111111111111112',
    tokenOut: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amountIn: 1.5,
    orderType: 'market',
    slippage: 1.0
  };
  
  const orderId = await submitOrder(marketOrderData);
  if (!orderId) {
    console.log('\n❌ Failed to submit order');
    return;
  }
  
  // Test 3: Get Order Status (immediate)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await getOrderStatus(orderId);
  
  // Wait for order to process
  console.log('\n⏳ Waiting for order to process (5 seconds)...');
  await sleep(5000);
  
  // Test 4: Get Order Status (after processing)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await getOrderStatus(orderId);
  
  // Test 5: Submit Limit Order
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const limitOrderData = {
    walletAddress: '6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez',
    tokenIn: 'So11111111111111111111111111111111111111112',
    tokenOut: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amountIn: 2.0,
    orderType: 'limit',
    slippage: 0.5,
    limitPrice: 1.48
  };
  
  await submitOrder(limitOrderData);
  
  // Test 6: Queue Metrics
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await getQueueMetrics();
  
  // Test 7: Invalid Order
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n❌ Testing Invalid Order (should fail)...');
  const invalidOrder = {
    walletAddress: '6xKS8hCXqh5VCBKhNJ6YJJqzqGwKCyp8CYVDJqmz3Lez',
    tokenIn: 'So11111111111111111111111111111111111111112'
    // Missing required fields
  };
  await submitOrder(invalidOrder);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);
