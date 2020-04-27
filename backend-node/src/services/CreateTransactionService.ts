import { getRepository, getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const checkCategoryExists = await categoriesRepository.findOne({
      where: { title: category },
    });

    const totalBalance = (await transactionsRepository.getBalance()).total;

    if (type === 'outcome' && totalBalance < value) {
      throw new AppError('Not enough money to withdraw', 400);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
    });

    if (!checkCategoryExists) {
      const categoryCreated = categoriesRepository.create({
        title: category,
      });

      await categoriesRepository.save(categoryCreated);

      transaction.category_id = categoryCreated.id;
    } else {
      transaction.category_id = checkCategoryExists.id;
    }

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
