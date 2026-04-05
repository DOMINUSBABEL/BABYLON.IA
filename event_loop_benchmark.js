import { processTask } from './src/agent_core.js';

async function measureEventLoopLag(durationMs) {
  return new Promise((resolve) => {
    let maxLag = 0;
    let lastTime = performance.now();

    const interval = setInterval(() => {
      const currentTime = performance.now();
      const lag = currentTime - lastTime - 10; // Expected interval is 10ms
      if (lag > maxLag) {
        maxLag = lag;
      }
      lastTime = currentTime;
    }, 10);

    setTimeout(() => {
      clearInterval(interval);
      resolve(maxLag);
    }, durationMs);
  });
}

async function runBenchmark() {
  console.log("Starting event loop benchmark...");

  // We'll run multiple tasks concurrently and measure the max event loop lag.
  // The lag occurs when synchronous code blocks the main thread.

  const lagPromise = measureEventLoopLag(7000); // Measure for 7 seconds (processTask takes ~6s)

  const tasks = [];
  for (let i = 0; i < 50; i++) {
    tasks.push(processTask(`task ${i}`, () => {}));
  }

  await Promise.all(tasks);
  const maxLag = await lagPromise;

  console.log(`Max event loop lag: ${maxLag.toFixed(2)} ms`);
}

runBenchmark();
