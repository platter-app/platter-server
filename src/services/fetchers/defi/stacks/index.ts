import w from './wallet';
import fs from 'fs/promises';
async function main(principal: string) {
  const allFunctions = (await fs.readdir('./src/services/fetchers/defi/stacks')).filter((e) => e !== 'index.ts');

  const allFetchers = allFunctions.map(async (e) => {
    const module = await import(`./${e}`);
    return module.default.fetcher(principal);
  });

  const allFunctionsResults = await Promise.allSettled(allFetchers);

  return {
    type: 'DeFi',
    displayName: 'Stacks',
    address: principal,
    currency: 'USD',
    data: allFunctionsResults.map((result) => {
      if (result.status === 'fulfilled') {
        return { name: result.value.displayName, balance: result.value.data };
      } else {
        return { name: 'Error', balance: 'An unknown error occurred. Please try again.' };
      }
    }),
  };
}

export default main;
