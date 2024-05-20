import axios from 'axios';
import { createHmac, randomUUID } from 'crypto';

const coinone = async (obj: { api_key: string; api_secret: string }) => {
  try {
    console.time('coinone');
    const { api_key, api_secret } = obj;

    const payload = {
      access_token: api_key,
      nonce: randomUUID(),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64'
    );

    // const encodedPayload = encode(JSON.stringify(payload));
    // const signature = crypto.createHmac("sha512", SECRET_KEY).update(encodedPayload).digest("hex");
    const signature = createHmac('sha512', api_secret)
      .update(encodedPayload)
      .digest('hex');
    const options = {
      url: 'https://api.coinone.co.kr/v2.1/account/balance/all',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-COINONE-PAYLOAD': encodedPayload,
        'X-COINONE-SIGNATURE': signature,
      },
      body: payload,
    };
    // console.log(await  axios
    // .post(options.url, options.body, options.headers))
    const res = await axios
      .post(options.url, options.body, { headers: options.headers })
      .then((res) => res.data.balances);
    const priceRes = await axios
      .get(
        'https://api.coinone.co.kr/public/v2/ticker_new/KRW?additional_data=false'
      )
      .then((res) => res.data.tickers);

    const priceObj: any = {
      krw: 1,
    };
    priceRes.forEach((e: any) => {
      priceObj[e.target_currency] = Number(e.first);
    });

    const filtered = res
      .filter((e: any) => Number(e.available) > 0 || Number(e.limit) > 0)
      .map((e: any) => {
        return {
          address: '',
          symbol: e.currency,
          balance: Number(e.available) + Number(e.limit),
          price: priceObj[e.currency.toLowerCase()],
          value:
            (Number(e.available) + Number(e.limit)) *
            priceObj[e.currency.toLowerCase()],
        };
      });

    console.timeEnd('coinone');
    return {
      type: 'CEFI',
      displayName: 'Coinone',
      chain: '',
      imgSrc:
        'https://coinone.co.kr/common/assets/images/coinone_logo/coinone_app_icon.jpg',
      balance: {
        wallet: filtered,
      },
      currency: 'KRW',
    };
  } catch (err) {
    console.log(err);
  }
};
export default coinone;
