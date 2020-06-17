import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer is not registered!');
    }

    const foundProducts = await this.productsRepository.findAllById(products);

    const updatedProducts = [] as IProduct[];

    const orderedProducts = products.map(orderedProduct => {
      const product = foundProducts.find(
        foundProduct => foundProduct.id === orderedProduct.id,
      );

      if (!product) {
        throw new AppError('One or more products are not registered!');
      }

      if (orderedProduct.quantity > product.quantity) {
        throw new AppError(
          'Required quantity for one or more products are not disponible.',
        );
      }

      product.quantity -= orderedProduct.quantity;

      updatedProducts.push(product);

      const orderedProductWithPrice = {
        product_id: orderedProduct.id,
        quantity: orderedProduct.quantity,
        price: product.price,
      };

      return orderedProductWithPrice;
    });

    await this.productsRepository.updateQuantity(updatedProducts);

    const order = this.ordersRepository.create({
      customer,
      products: orderedProducts,
    });

    return order;
  }
}

export default CreateOrderService;
