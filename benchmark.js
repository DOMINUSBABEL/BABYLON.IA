import { processTask } from './src/agent_core.js';

async function main() {
  const start = performance.now();
  await processTask("test prompt", () => {});
  const end = performance.now();
  console.log(`Execution time: ${end - start} ms`);
}

main();
