import path from 'path';
import { requirements } from './test-arguments.js';

// ts-node test/cefi-test.js coinone

const cefiName = process.argv[2];

const filePath = path.join('../src/services/fetchers/cefi', cefiName, 'index.ts');

async function run() {
  const cefi = await import(filePath);

  // find requirements

  const requirement = requirements[cefiName];

  await cefi.default(requirement);
}

run();
