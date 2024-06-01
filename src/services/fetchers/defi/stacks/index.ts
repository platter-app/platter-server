import w from './wallet';
import fs from 'fs/promises';
async function main(principal: string) {
  const allFunctions = (await fs.readdir('./src/services/fetchers/defi/stacks')).filter((e) => e !== 'index.ts');

  const allFetchers = allFunctions.map(async (e) => {
    const module = await import(`./${e}`);
    return module.default.fetcher(principal);
  });

  const allFunctionsResults = await Promise.all(allFetchers);

  return {
    type: 'DeFi',
    displayName: 'Stacks',
    address: principal,
    currency: 'USD',
    data: allFunctionsResults.map((result) => ({ name: result.displayName, balance: result.data })),
  };
}

export default main;
