import axios from 'axios';
import { createHmac } from 'crypto';
import { encodeBase64 } from 'hono/utils/encode';

class XCoinAPI {
  apiUrl: string;
  api_key: string;
  api_secret: string;

  constructor(api_key: string, api_secret: string) {
    this.apiUrl = 'https://api.bithumb.com';
    this.api_key = api_key;
    this.api_secret = api_secret;
  }

  xcoinApiCall(endPoint: string, paramsObject = {}) {
    const api_host = this.apiUrl + endPoint;
    const httpHeaders = this._getHttpHeaders(endPoint, paramsObject, this.api_key, this.api_secret);

    const rgParams = {
      endPoint: endPoint,
      ...paramsObject,
    };

    const options = {
      method: 'POST',
      url: api_host,
      headers: httpHeaders,
      form: rgParams,
    };
    const formdata = new FormData();
    formdata.set('endPoint', endPoint);
    formdata.set('currency', 'ALL');
    return axios
      .post(api_host, formdata, {
        headers: { ...options.headers },
      })
      .then((res) => res.data)
      .catch((err) => err.response.data);
  }
  _getHttpHeaders(endPoint: string, rgParams: any, api_key: string, api_secret: string) {
    const bodyToUrl =
      '&' +
      Object.entries(rgParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    // @ts-ignore
    const strData = ('endPoint=' + endPoint + bodyToUrl).replaceAll('/', '%2F');
    const nNonce = this.usecTime();
    const sign = Buffer.from(
      createHmac('sha512', api_secret)
        .update(endPoint + chr(0) + strData + chr(0) + nNonce)
        .digest('hex')
    ).toString('base64');
    return {
      'Api-Key': api_key,
      'Api-Sign': sign,
      // "api-client-type": "2",
      'Api-Nonce': nNonce.toString(),
      // "content-type": "application/x-www-form-urlencoded",
      // accept: "application/json",
    };
  }
  usecTime() {
    let rgMicrotime = (microtime() as string).split(' '),
      usec = rgMicrotime[0] as string,
      sec = rgMicrotime[1];

    usec = usec.substr(2, 3);
    return Number(String(sec) + String(usec));
  }
}

const microtime = (get_as_float: boolean = false) => {
  //  discuss at: http://phpjs.org/functions/microtime/
  //	original by: Paulo Freitas
  //  example 1: timeStamp = microtime(true);
  //  example 1: timeStamp > 1000000000 && timeStamp < 2000000000
  //  returns 1: true
  const now = new Date().getTime() / 1000;
  const s = parseInt(now.toString(), 10);

  return get_as_float ? now : Math.round((now - s) * 1000) / 1000 + ' ' + s;
};

const chr = (codePt: any) => {
  //  discuss at: http://phpjs.org/functions/chr/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Brett Zamir (http://brett-zamir.me)
  //   example 1: chr(75) === 'K';
  //   example 1: chr(65536) === '\uD800\uDC00';
  //   returns 1: true
  //   returns 1: true

  if (codePt > 0xffff) {
    // Create a four-byte string (length 2) since this code point is high
    //   enough for the UTF-16 encoding (JavaScript internal use), to
    //   require representation with two surrogates (reserved non-characters
    //   used for building other characters; the first is "high" and the next "low")
    codePt -= 0x10000;
    return String.fromCharCode(0xd800 + (codePt >> 10), 0xdc00 + (codePt & 0x3ff));
  }
  return String.fromCharCode(codePt);
};

const bithumb = async (obj: { api_key: string; api_secret: string }) => {
  console.time('bithumb');
  const { api_key, api_secret } = obj;
  const res = await new XCoinAPI(api_key, api_secret)
    .xcoinApiCall('/info/balance', {
      currency: 'ALL',
    })
    .then((res: any) => res.data)
    .then((res) => {
      if (res.status === '5100') {
        // retry
        return new XCoinAPI(api_key, api_secret)
          .xcoinApiCall('/info/balance', {
            currency: 'ALL',
          })
          .then((res: any) => res.data);
      } else {
        return res;
      }
    })
    .catch((err) => {
      console.log(err);
    });
  const priceRes = await axios.get('https://api.bithumb.com/public/ticker/ALL_KRW').then((res) => res.data.data);
  const priceObj: any = {};
  Object.entries(priceRes).forEach(([key, value]) => {
    // @ts-ignore
    priceObj[key] = Number(value.opening_price);
  });

  if (res.status === '5300') {
    throw new Error('Invalid Apikey');
  }
  // const totalPrice;
  const allTotalData: any[] = [];
  Object.entries(res).forEach(([key, value]) => {
    if (key.includes('total_')) {
      const asset = key.replace('total_', '');
      const price = priceObj[asset.toUpperCase()] ? priceObj[asset.toUpperCase()] : 1;
      allTotalData.push({
        address: '',
        symbol: asset,
        balance: Number(value),
        price: price,
        value: Number(value) * price,
      });
    }
  });
  console.timeEnd('bithumb');
  return {
    type: 'CEFI',
    displayName: 'Bithumb',
    chain: '',
    imgSrc: 'https://m.bithumb.com/react/static/9e1490b6/media/icon-bithumb-logo.svg',
    balance: {
      wallet: allTotalData,
    },
    currency: 'KRW',
  };
};

export default bithumb;
