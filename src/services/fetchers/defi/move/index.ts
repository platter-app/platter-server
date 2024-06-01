import fs from 'fs/promises';
async function main(address: string) {
  // https://portfolio.martianwallet.xyz/
  // https://api.martianwallet.xyz/v1/prices?blockchain=sui
  // https://api.martianwallet.xyz/v1/prices?blockchain=aptos
  // https://api.martianwallet.xyz/v1/coins/portfolio/mainnet
  /*
  https://indexer.mainnet.aptoslabs.com/v1/graphql/
  {
	"query": "\n    query getAccountCoinsData($owner_address: String, $offset: Int, $limit: Int) {\n  current_coin_balances(\n    where: {owner_address: {_eq: $owner_address}}\n    offset: $offset\n    limit: $limit\n  ) {\n    amount\n    coin_type\n    coin_info {\n      name\n      decimals\n      symbol\n    }\n  }\n}\n    ",
	"variables": {
		"owner_address": "0x88e018cfb6218182fb19f2c3e8b6d65f0bb4e2623507b6d580453ac9c8c66b3c" // address
	}
  }

  // sui
  https://sui-mainnet.blockvision.org/v1/2PFBQoJRHoiqCPNuMZRw3ty9ONe
  {
	"jsonrpc": "2.0",
	"id": "3",
	"method": "suix_getAllCoins",
	"params": [
		"0x3718d897967f02ddda918935a4a9a2a878e1b50cf697022082a2f9e47826da7c", // address
		null,
		null
	]
  }

  */
  const allFunctions = (await fs.readdir('./src/services/fetchers/defi/move')).filter((e) => e !== 'index.ts');

  const allFetchers = allFunctions.map(async (e) => {
    const module = await import(`./${e}`);
    return module.default.fetcher(address);
  });

  const allFunctionsResults = await Promise.all(allFetchers);

  return {
    type: 'DeFi',
    displayName: 'Move',
    address: address,
    currency: 'USD',
    data: allFunctionsResults.map((result) => ({ name: result.displayName, balance: result.data })),
  };
}

export default main;
