export type ShippingQuoteOption = {
  provider: 'MELHOR_ENVIO';
  serviceId: string;
  serviceName: string;
  carrierName: string;
  priceInCents: number;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
};

export type ShippingProduct = {
  id: string;
  name: string;
  quantity: number;
  unitPriceInCents: number;
  packageWeightInGrams: number;
  packageWidthCm: number;
  packageHeightCm: number;
  packageLengthCm: number;
};
