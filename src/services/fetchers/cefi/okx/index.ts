import axios from 'axios';
import { createHmac } from 'crypto';

async function call(path: string, apiKey: string, secret: string, passphrase: string) {
  const timestamp = new Date().toISOString();

  const sign = createHmac('sha256', secret)
    .update(timestamp + 'GET' + path)
    .digest('base64');

  const headers = {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': sign,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': passphrase,
  };

  const data = (await axios
    .get('https://www.okex.com' + path, {
      headers: headers,
    })
    .then((res) => res.data)) as any;

  if (data.code !== '0') throw new Error(data.msg);
  return data;
}

//  /api/v5/asset/balances funding account
// /api/v5/account/balance trading account
const okxFunding = async (obj: { api_key: string; api_secret: string; passphrase: string }) => {
  const { api_key, api_secret, passphrase } = obj;
  const prices = await call('/api/v5/market/tickers?instType=SPOT', api_key, api_secret, passphrase).then(
    (res) => res.data
  );
  const usdtPrices = prices.filter((e: any) => e.instId.includes('-USDT'));

  const usdtPricesMap = usdtPrices.reduce((acc: any, cur: any) => {
    return { ...acc, [cur.instId]: cur };
  }, {});
  // add usdt
  usdtPricesMap['USDT-USDT'] = { last: 1 };

  const res = await call('/api/v5/asset/balances', api_key, api_secret, passphrase).then((res) => res.data);

  const formatted = res
    // .filter((e: any) =>)
    .map((e: any) => {
      return {
        address: '',
        symbol: e.ccy,
        balance: e.bal,
        price: usdtPricesMap[e.ccy + '-USDT']?.last ?? 0,
        value: e.bal * usdtPricesMap[e.ccy + '-USDT']?.last ?? 0,
      };
    });

  return formatted;
};
const okxTrading = async (obj: { api_key: string; api_secret: string; passphrase: string }) => {
  const { api_key, api_secret, passphrase } = obj;
  const res = await call('/api/v5/account/balance', api_key, api_secret, passphrase).then((res) => res.data[0]);

  const formatted = res.details
    // .filter((e: any) =>)
    .map((e: any) => {
      return {
        address: '',
        symbol: e.ccy,
        balance: e.eq,
        price: e.eq / e.eqUsd,
        value: e.eqUsd,
      };
    });

  return formatted;
};
const okx = async (obj: { api_key: string; api_secret: string; passphrase: string }) => {
  try {
    console.time('okx');
    const { api_key, api_secret, passphrase } = obj;

    const [funding, trading] = await Promise.all([
      okxFunding({ api_key, api_secret, passphrase }),
      okxTrading({ api_key, api_secret, passphrase }),
    ]);
    console.timeEnd('okx');
    return {
      type: 'CEFI',
      displayName: 'OKX',
      chain: '',
      imgSrc:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA1UlEQVR4AWJwL/CBY0D7ZYCBQQhE4at0iU6RAB2pe0TnCKDsUTpFfw/YVoPo32dpeNDsvPmWStPDdqWu9ifB2ww9b80vsXC/LvSEGM0HCITBAkkWAIkIkADQuBISzrkWY2whhEHee8kIuef38IDXOgAKZ1FrFc2QmwS8lgFAvwsAXh8EOADY0TB8KufclFJNaz0Ia8hNauC1DiAJjYRATqrbB4C/FQK5DwMcAMIm3H8MSyn7juG5CQ8A/UFCe5IRxH+WWyKA4Y9m/OF0HM/NC+O5vff8ARHpaPq63KdGAAAAAElFTkSuQmCC',
      balance: {
        funding,
        trading,
      },
      currency: 'USD',
    };
  } catch (error) {
    console.log(error);
  }
};

export default okx;
