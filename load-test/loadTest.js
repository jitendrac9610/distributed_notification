/**
 * NotifyX Performance & Load Testing Script
 * Employs Node.js native fetch (v18+) to run without dependencies.
 * Dispatches 1,000 notifications in batches, measuring queue and database metrics.
 */

const BACKEND_URL = process.argv[2] || 'http://localhost:5000/api';
const CONCURRENCY_BATCH_SIZE = 50;
const TOTAL_NOTIFICATIONS = 1000;

async function run() {
  console.log('================================================================');
  console.log('         NotifyX distributed load testing simulation            ');
  console.log('================================================================');
  console.log(`Backend API Endpoint: ${BACKEND_URL}`);
  console.log(`Targeting Volume:    ${TOTAL_NOTIFICATIONS} notifications`);
  console.log(`Concurrency Batch:   ${CONCURRENCY_BATCH_SIZE} workers\n`);

  // 1. Authenticate to retrieve Admin JWT
  let token;
  try {
    const loginResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@notifyx.com',
        password: 'Password123!',
      }),
    });

    const body = await loginResponse.json();
    if (!body.success) {
      throw new Error(body.message || 'Login failed');
    }
    token = body.data.token;
    console.log('🔑 Administrator authenticated successfully.');
  } catch (error) {
    console.error('❌ Authentication failed. Make sure the backend is running and seeded:', error.message);
    process.exit(1);
  }

  // 2. Ingestion phase
  console.log('\n🚀 Starting ingestion test...');
  const startTime = Date.now();
  let succeeded = 0;
  let failed = 0;
  const latencies = [];

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Process notifications in batches
  for (let i = 0; i < TOTAL_NOTIFICATIONS; i += CONCURRENCY_BATCH_SIZE) {
    const batchPromises = [];
    const currentBatchSize = Math.min(CONCURRENCY_BATCH_SIZE, TOTAL_NOTIFICATIONS - i);

    for (let j = 0; j < currentBatchSize; j++) {
      const index = i + j;
      const payload = {
        recipientEmail: 'user@notifyx.com',
        type: 'ALERT',
        priority: index % 4 === 0 ? 'CRITICAL' : 'NORMAL',
        title: `Load Test Message #${index}`,
        message: `This is load testing message #${index} generated at timestamp ${Date.now()}`,
        metadata: { index, batch: Math.floor(i / CONCURRENCY_BATCH_SIZE) },
      };

      const workerPromise = (async () => {
        const reqStart = Date.now();
        try {
          const res = await fetch(`${BACKEND_URL}/notifications`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
          const resBody = await res.json();
          latencies.push(Date.now() - reqStart);

          if (res.status === 201 && resBody.success) {
            succeeded++;
          } else {
            failed++;
            console.error(`  - Failed to ingest #${index}: HTTP ${res.status} - ${resBody.message || 'Error'}`);
          }
        } catch (err) {
          failed++;
          latencies.push(Date.now() - reqStart);
        }
      })();

      batchPromises.push(workerPromise);
    }

    await Promise.all(batchPromises);
    const progress = Math.min(100, Math.round(((i + currentBatchSize) / TOTAL_NOTIFICATIONS) * 100));
    process.stdout.write(`⚡ Ingestion Progress: ${progress}% (${i + currentBatchSize}/${TOTAL_NOTIFICATIONS})\r`);
  }

  const ingestionEndTime = Date.now();
  const ingestionDuration = (ingestionEndTime - startTime) / 1000;
  const avgIngestionLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  console.log('\n\nIngestion Phase Complete.');
  console.log(`- Total Duration:       ${ingestionDuration.toFixed(2)} seconds`);
  console.log(`- Throughput:           ${(succeeded / ingestionDuration).toFixed(2)} req/sec`);
  console.log(`- Average Ingestion RT: ${avgIngestionLatency.toFixed(1)} ms`);
  console.log(`- Success Count:        ${succeeded}`);
  console.log(`- Failure Count:        ${failed}`);

  // 3. Queue processing metrics polling
  console.log('\n⏳ Polling backend metrics to monitor queue execution...');
  let queuePending = true;
  let attempts = 0;
  
  while (queuePending && attempts < 30) {
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const monitorRes = await fetch(`${BACKEND_URL}/monitor`, { headers });
      const stats = await monitorRes.json();
      
      if (stats.success) {
        const q = stats.data.services.queue;
        const totalProcessed = q.completed + q.failed;
        console.log(
          `[Queue Sync] Waiting: ${q.waiting} | Active: ${q.active} | Completed: ${q.completed} | Failed: ${q.failed}`
        );

        if (q.waiting === 0 && q.active === 0) {
          console.log('\n✅ BullMQ has processed all queued jobs.');
          queuePending = false;
        }
      }
    } catch (err) {
      console.error('Failed to query monitor stats:', err.message);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log('\n================================================================');
  console.log('                     LOAD TEST METRICS SUMMARY                  ');
  console.log('================================================================');
  console.log(`- Total Pipeline Duration:  ${totalTime.toFixed(2)} seconds`);
  console.log(`- Average Processing Speed: ${(TOTAL_NOTIFICATIONS / totalTime).toFixed(2)} notifications/sec`);
  console.log('================================================================\n');
}

run();
