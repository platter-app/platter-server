import axios from 'axios';
import { createHmac } from 'crypto';

async function call(
  needAuth: boolean,
  method: string,
  path: string,
  apiKey: string,
  secret: string,
  bodyJson = null,
  recvWindow = null
) {
  const bodyStr = bodyJson ? JSON.stringify(bodyJson) : '';
  const methodInUpperCase = method.toUpperCase();
  const timestamp = new Date().getTime().toString();
  const includeQuerystring = methodInUpperCase === 'GET' && path.startsWith('/orders?');
  const p = includeQuerystring ? path : path.split('?')[0];
  const msg = `t${timestamp}${methodInUpperCase}${p}${recvWindow || ''}${bodyStr}`;
  const rawSecret = Buffer.from(secret, 'base64');
  const signature = createHmac('sha512', rawSecret).update(msg).digest('base64');

  const data = await axios
    .get(`https://api.gopax.co.kr${path}`, {
      headers: {
        'api-key': apiKey,
        timestamp: timestamp,
        signature: signature,
      },
    })
    .then((res) => res.data)
    .catch((err) => err.response.data);

  // normalize data

  return data;
}
type TGopaxBalanace = {
  asset: string;
  avail: number;
  hold: number;
  pendingWithdrawal: number;
  lastUpdatedAt: string;
  blendedPrice: number;
};
const gopax = async (obj: { api_key: string; api_secret: string }) => {
  console.time('gopax');
  const { api_key, api_secret } = obj;
  const res = await call(true, 'GET', '/balances', api_key, api_secret);
  if (!res || res.errorMessage) {
    throw new Error('Gopax error: ' + res.errorMessage);
  }

  const formatted = res
    .filter((e: TGopaxBalanace) => e.avail > 0 || e.hold > 0)
    .map((e: TGopaxBalanace) => {
      return {
        symbol: e.asset,
        balance: e.avail + e.hold,
        price: e.blendedPrice,
        value: (e.avail + e.hold) * e.blendedPrice,
      };
    });
  console.timeEnd('gopax');
  return {
    type: 'CEFI',
    displayName: 'Gopax',
    imgSrc:
      'data:image/png;base64,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',
    data: [
      {
        name: '현물 지갑',
        balance: formatted,
      },
    ],
    currency: 'KRW',
  };
};

export default gopax;
