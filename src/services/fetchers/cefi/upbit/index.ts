import axios from 'axios';

const upbit = async (obj: { api_key: string; api_secret: string }) => {
  try {
    console.time('upbit');
    const { api_key, api_secret } = obj;

    const data = await axios
      .get(`http://52.193.50.19:3000/upbit?api_key=${api_key}&api_secret=${api_secret}`)
      .then((res) => res.data);
    const holdings = data.map((holding: any) => {
      return {
        address: '',
        symbol: holding.currency,
        token: holding.currency,
        balance: Number(holding.balance),
        price: Number(holding.price ?? 0),
        value: Number(holding.balance ?? 0) * Number(holding.price ?? 0),
      };
    });

    console.timeEnd('upbit');
    return {
      type: 'CEFI',
      displayName: 'upbit',
      chain: '',
      imgSrc: 'https://upbit.co.kr/common/assets/images/upbit_logo/upbit_app_icon.jpg',
      balance: {
        holdings,
      },
      currency: 'KRW',
    };
  } catch (err) {
    console.log(err);
  }
};
export default upbit;
