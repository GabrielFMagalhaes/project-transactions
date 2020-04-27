import { getCustomRepository, getRepository, In } from 'typeorm';
import fs from 'fs';
import csvParse from 'csv-parse';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    // Preparando leitura
    const transactionsReadStream = fs.createReadStream(filePath);

    // Iniciando a leitura do arquivo a partir da segunda linha, conforme template
    const parsers = csvParse({
      from_line: 2,
    });

    // Ler linha a linha com a disponibilizacao do pipe
    const parseCSV = transactionsReadStream.pipe(parsers);

    // Nova linha para cada data encontrada
    parseCSV.on('data', async row => {
      const [title, type, value, category] = row.map((cell: string) =>
        cell.trim(),
      );

      // Verificação do template
      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    // Promise para aguardar a disponibilização do evento 'end' pelo parseCSV
    // Quando finalizar a leitura de todo o arquivo
    await new Promise(resolve => parseCSV.on('end', resolve));

    // Coletando todas as categorias do BD que existem com o parametro passado
    const existentCategories = await categoriesRepository.find({
      where: {
        // Checagem dentro do array
        title: In(categories),
      },
    });

    // Mapeia todos os titulos das categorias
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    // Coletando todas as categorias do BD que não existem com o parametro passado
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      // Filtragem para entradas duplicadas
      .filter((value, index, self) => {
        return self.indexOf(value) === index;
      });

    // Criar novas categorias no BD
    const newCategories = categoriesRepository.create(
      // Preparar todos os campos do objeto
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
