export type TCefi = {
  type: 'CEFI';
  displayName: string;
  imgSrc: string;
  baseCurrency: 'KRW' | 'USD';

  data: TCefiSpotWallet[];
};

export type TCefiSpotWallet = {
  name: string;
  balance: {
    symbol: string;
    balance: number;
    price: number;
    value: number;
  }[];
};
