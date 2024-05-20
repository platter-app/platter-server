import axios from 'axios';
import { createHmac } from 'crypto';

// define const variables

let pricesMap: any = {};
async function call(path: string, apiKey: string, secret: string, isPost = false) {
  const timestamp = new Date().getTime().toString();
  const sign = createHmac('sha256', secret)
    .update('timestamp=' + timestamp)
    .digest('hex');

  const headers = {
    'X-MBX-APIKEY': apiKey,
  };
  if (isPost) {
    const data = (await axios
      .post('https://api.binance.com' + path + '?timestamp=' + timestamp + '&signature=' + sign, {}, { headers })
      .then((res) => res.data)) as any;
    if (data.msg) throw new Error(data.msg);
    return data;
  } else {
    const data = (await axios
      .get('https://api.binance.com' + path + '?timestamp=' + timestamp + '&signature=' + sign, {
        headers: headers,
      })
      .then((res) => res.data)) as any;
    if (data.msg) throw new Error(data.msg);
    return data;
  }
}
async function futuresCall(path: string, apiKey: string, secret: string, isPost = false) {
  const timestamp = new Date().getTime().toString();
  const sign = createHmac('sha256', secret)
    .update('timestamp=' + timestamp)
    .digest('hex');

  const headers = {
    'X-MBX-APIKEY': apiKey,
  };
  if (isPost) {
    const data = (await axios
      .post('https://fapi.binance.com' + path + '?timestamp=' + timestamp + '&signature=' + sign, {}, { headers })
      .then((res) => res.data)) as any;
    if (data.msg) throw new Error(data.msg);
    return data;
  } else {
    const data = (await axios
      .get('https://fapi.binance.com' + path + '?timestamp=' + timestamp + '&signature=' + sign, {
        headers: headers,
      })
      .then((res) => res.data)) as any;
    if (data.msg) throw new Error(data.msg);
    return data;
  }
}

const fetchPrice = async () => {
  const prices = (await axios.get('https://www.binance.com/api/v3/ticker/price').then((res) => res.data)) as {
    symbol: string;
    price: string;
  }[];

  pricesMap = prices.reduce(
    (acc: any, cur: any) => {
      return { ...acc, [cur.symbol]: cur };
    },
    {
      USDTUSDT: {
        symbol: 'USDTUSDT',
        price: 1,
      },
    }
  );
};
///  GET /api/v3/account
const binanceSpot = async (obj: { api_key: string; api_secret: string }) => {
  const { api_key, api_secret } = obj;

  const res = await call('/api/v3/account', api_key, api_secret).then((res) => res);
  const formatted = res.balances
    .filter((e: any) => Number(e.free) > 0 || Number(e.locked) > 0)
    // filter first 2 letter contains LD
    .filter((e: any) => e.asset.length >= 2 && e.asset.slice(0, 2) !== 'LD')
    .map((e: any) => {
      return {
        address: '',
        symbol: e.asset,
        balance: Number(e.free) + Number(e.locked),
        price: pricesMap[e.asset + 'USDT']?.price ?? 0,
        value: (Number(e.free) + Number(e.locked)) * (pricesMap[e.asset + 'USDT']?.price ?? 0),
      };
    });

  return formatted;
};
const binanceFunding = async (obj: { api_key: string; api_secret: string }) => {
  const { api_key, api_secret } = obj;

  const res = await call('/sapi/v1/asset/get-funding-asset', api_key, api_secret, true).then((res) => res);
  const formatted = res.map((e: any) => {
    return {
      address: '',
      symbol: e.asset,
      balance: Number(e.free) + Number(e.locked),
      price: pricesMap[e.asset + 'USDT']?.price ?? 0,
      value: (Number(e.free) + Number(e.locked)) * (pricesMap[e.asset + 'USDT']?.price ?? 0),
    };
  });
  return formatted;
};
const binanceEarn = async (obj: { api_key: string; api_secret: string }) => {
  const { api_key, api_secret } = obj;

  const res = await call('/sapi/v1/simple-earn/flexible/position', api_key, api_secret).then((res) => res);

  const formatted = res.rows
    .filter((e: any) => Number(e.totalAmount) > 0)
    .map((e: any) => {
      return {
        address: '',
        symbol: e.asset,
        balance: Number(e.totalAmount),
        price: pricesMap[e.asset + 'USDT']?.price ?? 0,
        value: Number(e.totalAmount) * (pricesMap[e.asset + 'USDT']?.price ?? 0),
      };
    });

  return formatted;
};
const binanceLoan = async (obj: { api_key: string; api_secret: string }) => {
  const { api_key, api_secret } = obj;

  const res = await call('/sapi/v1/loan/ongoing/orders', api_key, api_secret).then((res) => res);
  const formatted: any[] = res.rows
    // filter first 2 letter contains LD
    .map((e: any): any => {
      return {
        address: '',
        collateralSymbol: e.collateralCoin,
        collateralBalance: e.collateralAmount,
        collateralPrice: pricesMap[e.collateralCoin + 'USDT']?.price ?? 0,

        borrowedSymbol: e.loanCoin,
        borrowedBalance: e.totalDebt,
        borrowedPrice: pricesMap[e.loanCoin + 'USDT']?.price ?? 0,
      };
    })
    .map((e: any) => {
      return {
        ...e,
        value: e.collateralBalance * e.collateralPrice - e.borrowedBalance * e.borrowedPrice,
      };
    });

  return formatted;
};
const binanceUsdFutures = async (obj: { api_key: string; api_secret: string }) => {
  const { api_key, api_secret } = obj;

  //https://binance-docs.github.io/apidocs/futures/en/#account-information-v2-user_data
  const res = await futuresCall(
    // "/fapi/v2/account",
    '/fapi/v2/positionRisk',
    api_key,
    api_secret
  ).then((res) => res);
  const formatted: any[] = res
    .filter((e: any) => Number(e.positionAmt) > 0)
    .map((e: any): any => {
      return {
        address: '',
        symbol: e.symbol,
        balance: e.positionAmt,
        entryPrice: e.entryPrice,
        leverage: e.leverage,
        markPrice: e.markPrice,
        positionSide: e.positionSide,
        unRealizedProfit: e.unRealizedProfit,
        notional: e.notional,
        value: e.notional / e.leverage - Number(e.unRealizedProfit),
      };
    });

  return formatted;
};
const binance = async (obj: { api_key: string; api_secret: string }) => {
  try {
    console.time('binance');
    const { api_key, api_secret } = obj;
    await fetchPrice();
    const [spot, earn, loan, funding, futures] = await Promise.all([
      binanceSpot({ api_key, api_secret }),
      binanceEarn({ api_key, api_secret }),
      binanceLoan({ api_key, api_secret }),
      binanceFunding({ api_key, api_secret }),
      binanceUsdFutures({ api_key, api_secret }),
    ]);

    console.timeEnd('binance');
    return {
      type: 'CEFI',
      displayName: 'Binance',

      chain: '',
      imgSrc:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA3ElEQVR4AcWXAQYDMRREF9DTBEBF7Un2JFWof6ZaeqvaA7TBp4xh2C9mGdjEviebJPlL5Tne7TkSi+NJ+DcTFjgkLHBIWOCQsMAhYYKjxHz4nhES8+CXTF2CwO8K/u8rJR5nBK4jHwVXEvmNrolSgsC1BMIlcEsAk9hJWx9ZqUTCSdsmJhwFNQZPyDFyI6BG3r2SERwuhxrh2Z9IMDgwgsC1BMJBYlVwSPgF7L/APwnry7DXl6Ee6rkbkYAXtmI9P/yHkf849l9I/Fcy/6XUfy33Fyb+0sxfnLrK8x8BCDupxYlOYwAAAABJRU5ErkJggg==',
      balance: {
        spot,
        earn,
        funding,
        loan,
        futures,
      },
      currency: 'USD',
    };
  } catch (e) {
    console.log(e);
  }
};

export default binance;
