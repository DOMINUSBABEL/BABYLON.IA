import { processTask } from './src/agent_core.js';

async function main() {
  console.log(await processTask("test prompt", (msg) => console.log(msg)));
}

main();
