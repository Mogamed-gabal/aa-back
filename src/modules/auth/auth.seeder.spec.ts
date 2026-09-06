import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { type Repository } from 'typeorm';
import { type Configuration } from '../../config/configuration';
import { AuthSeeder } from './auth.seeder';
import { User } from './entities/user.entity';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthSeeder', () => {
  const hashMock = bcrypt.hash as unknown as jest.Mock<Promise<string>>;
  let authSeeder: AuthSeeder;
  let usersRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let configService: {
    getOrThrow: jest.Mock;
  };

  beforeEach(() => {
    usersRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    configService = {
      getOrThrow: jest.fn((key: string): string => {
        if (key === 'admin.email') {
          return 'Admin@Example.com';
        }

        return 'local-password';
      }),
    };
    authSeeder = new AuthSeeder(
      usersRepository as unknown as Repository<User>,
      configService as unknown as ConfigService<Configuration>,
    );
    jest.clearAllMocks();
  });

  it('creates the admin account when it does not exist', async () => {
    const createdUser = {
      email: 'admin@example.com',
      password: 'hashed-password',
      fullName: 'Administrator',
    } as User;
    usersRepository.findOne.mockResolvedValue(null);
    hashMock.mockResolvedValue('hashed-password');
    usersRepository.create.mockReturnValue(createdUser);
    usersRepository.save.mockResolvedValue(createdUser);

    await authSeeder.onApplicationBootstrap();

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { email: 'admin@example.com' },
    });
    expect(hashMock).toHaveBeenCalledWith('local-password', 12);
    expect(usersRepository.create).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'hashed-password',
      fullName: 'Administrator',
    });
    expect(usersRepository.save).toHaveBeenCalledWith(createdUser);
  });

  it('does not create a duplicate admin account', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'existing-user' });

    await authSeeder.onApplicationBootstrap();

    expect(usersRepository.create).not.toHaveBeenCalled();
    expect(usersRepository.save).not.toHaveBeenCalled();
    expect(hashMock).not.toHaveBeenCalled();
  });
});
