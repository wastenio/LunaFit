import { splitList } from '@/features/products/product-utils';

type CartProduct = {
  sizes: string;
  colors: string;
  stock: number;
  isActive: boolean;
};

export function parsePositiveInteger(value: unknown) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function validateCartSelection(
  product: CartProduct,
  size: string,
  color: string,
  quantity: number
) {
  if (!product.isActive) {
    return 'Este produto nao esta disponivel para compra.';
  }

  if (!splitList(product.sizes).includes(size)) {
    return 'Selecione um tamanho valido.';
  }

  if (!splitList(product.colors).includes(color)) {
    return 'Selecione uma cor valida.';
  }

  if (quantity > product.stock) {
    return 'A quantidade solicitada e maior que o estoque disponivel.';
  }

  return null;
}
