import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
const upbit = async (obj: { api_key: string; api_secret: string }) => {
  try {
    console.time('upbit');
    const { api_key, api_secret } = obj;
    const access_key = api_key;
    const secret_key = api_secret;

    const server_url = 'https://api.upbit.com';

    const payload = {
      access_key: access_key,
      nonce: uuidv4(),
    };

    const token = jwt.sign(payload, secret_key);

    const marketOption = {
      method: 'GET',
      url: server_url + '/v1/market/all',
      headers: { Authorization: `Bearer ${token}` },
    };

    const markets = await fetch(marketOption.url, marketOption)
      .then((res) => res.json() as unknown as any[])
      .then((res) => res.map((item: any) => item.market));

    const priceOption = {
      method: 'GET',
      url: server_url + '/v1/ticker' + '?markets=' + markets,
      headers: { Authorization: `Bearer ${token}` },
    };
    const priceData = await fetch(priceOption.url, priceOption).then((res) => res.json() as unknown as any[]);

    const priceDataToKRWPair: any = {
      KRW: 1,
    };

    // retreive price data from KRW pair
    priceData.forEach((item: any) => {
      const [base, quote] = item.market.split('-');
      if (base === 'KRW') {
        priceDataToKRWPair[quote] = item.trade_price;
      }
    });

    // retreive price data from btc pair with KRW-BTC price
    priceData.forEach((item: any) => {
      const [base, quote] = item.market.split('-');
      if (base === 'BTC') {
        priceDataToKRWPair[quote] = item.trade_price * priceDataToKRWPair['BTC'];
      }
    });

    const options = {
      method: 'GET',
      url: server_url + '/v1/accounts',
      headers: { Authorization: `Bearer ${token}` },
    };
    const res = await fetch(options.url, options).then((res) => res.json() as unknown as any[]);

    const data = res.map((item: any) => {
      return {
        ...item,
        price: priceDataToKRWPair[item.currency] ?? 0,
        value: item.balance * priceDataToKRWPair[item.currency] ?? 0,
      };
    });

    const holdings = data.map((holding: any) => {
      return {
        symbol: holding.currency,
        balance: Number(holding.balance),
        price: Number(holding.price ?? 0),
        value: Number(holding.balance ?? 0) * Number(holding.price ?? 0),
      };
    });

    console.timeEnd('upbit');
    return {
      type: 'CEFI',
      displayName: 'upbit',
      imgSrc: 'https://upbit.co.kr/common/assets/images/upbit_logo/upbit_app_icon.jpg',
      data: [
        {
          name: '현물 지갑',
          balance: holdings,
        },
      ],
      currency: 'KRW',
    };
  } catch (err) {
    return {
      type: 'CEFI',
      displayName: 'upbit',
      imgSrc: 'https://upbit.co.kr/common/assets/images/upbit_logo/upbit_app_icon.jpg',
      data: '알 수 없는 에러가 발생했습니다. 다시 시도해주세요.',
      currency: 'KRW',
    };
  }
};
export default upbit;
