import axios from 'axios';

type TFungibleToken = {
  balance: string;
  token: {
    symbol: string;
    contract_id: string;
    decimals: number;
    image_url: string;
    metrics: {
      price_usd: number | null;
    };
  };
};
async function getWallets(principal: string) {
  const res = await axios.get(`https://api.stxtools.io/wallets/${principal}`).then((res) => res.data);

  const stxInfo = await axios.get('https://api.stxtools.io/tokens/info/stx').then((res) => res.data);
  const stxBalance = Number(res.stx.balance) / 1e6;

  const stxData = {
    symbol: 'STX',
    balance: stxBalance,
    price: stxInfo.metrics.price_usd,
    value: stxBalance * stxInfo.metrics.price_usd,
    imgSrc: stxInfo.image_url,
  };

  const functionsTokensBalances = res.fungible_tokens.map((token: TFungibleToken) => {
    const price = token.token.metrics.price_usd ?? 0;
    return {
      symbol: token.token.symbol,
      balance: Number(token.balance) / 10 ** token.token.decimals,
      price: price,
      value: (Number(token.balance) / 10 ** token.token.decimals) * price,
      imgSrc: token.token.image_url,
    };
  });
  return {
    type: 'DEFI',
    displayName: 'Stacks Wallet',
    address: principal,
    currency: 'USD',
    data: [stxData, ...functionsTokensBalances],
  };
}

export default {
  fetcher: getWallets,
};
