import axios from 'axios';
/**
 * Requierments
 * @typedef {Object} KorbitRequirements
 * @property {string} api_key - api 공개 키
 * @property {string} api_secret - api secret 키 ()
 */

/**
 * @param {KorbitRequirements} korbitRequirements
 */
const korbit = async (korbitRequirements: { api_key: string; api_secret: string }) => {
  try {
    console.time('korbit');
    const { api_key, api_secret } = korbitRequirements;

    const res = (await axios
      .post(
        'https://api.korbit.co.kr/v1/oauth2/access_token' +
          '?client_id=' +
          api_key +
          '&client_secret=' +
          api_secret +
          '&grant_type=client_credentials',
        {}
      )
      .then((res) => res.data)
      .catch((err) => err.response.data)) as any;
    const accessToken = res.access_token;

    const data = await axios
      .get('https://api.korbit.co.kr/v1/user/balances', {
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      })
      .then((res) => res.data)
      .catch((err) => err.response.data);

    const pricesMap: {
      [key: string]: string;
    } = {
      krw_krw: '1',
    };
    await axios
      .get('https://api.korbit.co.kr/v1/ticker/detailed/all', {
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      })
      .then((res) =>
        Object.entries(res.data).forEach(([key, value]) => {
          // @ts-ignore
          pricesMap[key] = value.last;
        })
      );
    const holdings = Object.entries(data)
      .filter(([, value]: [string, any]) => Number(value.available) > 0 || Number(value.trade_in_use) > 0)
      .map(([key, value]: [string, any]) => {
        return {
          symbol: key,
          balance: Number(value.available) + Number(value.trade_in_use),
          price: Number(pricesMap[key + '_krw']),
          value: (Number(value.available) + Number(value.trade_in_use)) * Number(pricesMap[key + '_krw']),
        };
      });
    console.timeEnd('korbit');
    return {
      type: 'CEFI',
      displayName: 'korbit',
      imgSrc: 'https://korbit.co.kr/common/assets/images/korbit_logo/korbit_app_icon.jpg',
      data: [
        {
          name: '현물 지갑',
          balance: holdings,
        },
      ],
      currency: 'KRW',
    };
  } catch (err) {
    console.log(err);
  }
};
export default korbit;
