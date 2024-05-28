import path from 'path';
import { requirements } from './test-arguments.js';

// ts-node test/cefi-test.js coinone

const cefiName = process.argv[2];

const filePath = path.join('../src/services/fetchers/cefi', cefiName, 'index.ts');

async function run() {
  const cefi = await import(filePath);

  // find requirements

  const requirement = requirements[cefiName];

  const res = await cefi.default(requirement);

  console.log(`거래소: ${res.displayName}`);
  console.log(`통화: ${res.currency}`);

  res.data.forEach((item) => {
    console.log(`타입: ${item.name}`);
    console.table(item.balance);
  });
}

run();
