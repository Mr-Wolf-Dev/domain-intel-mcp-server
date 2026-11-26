import { pathToFileURL } from 'node:url';
import { runActorBatch, type DomainBillingEvent } from './adapters/apify-actor.js';
import { createConfiguredMcpServer, createDomainMcpHttpServer } from './adapters/mcp-server.js';
import { NodeDomainInspector } from './adapters/node-domain-inspector.js';
import { runDualModeActor } from './shared/actor-runner.js';
import { createApifyBillingMeter } from './shared/billing-meter.js';

export async function main(): Promise<void> {
  const inspector = new NodeDomainInspector();
  const billing = createApifyBillingMeter<DomainBillingEvent>();

  await runDualModeActor({
    runBatch: () => runActorBatch(inspector, billing),
    createMcpServer: () => createDomainMcpHttpServer({ inspector, billing }),
    createStdioMcpServer: () => createConfiguredMcpServer({ inspector, billing }),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
