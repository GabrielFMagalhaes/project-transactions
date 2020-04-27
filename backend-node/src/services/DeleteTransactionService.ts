import { getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const repository = await transactionsRepository.findOne(id);

    if (!repository) {
      throw new AppError('Repository not found', 400);
    }

    await transactionsRepository.remove(repository);
  }
}

export default DeleteTransactionService;
