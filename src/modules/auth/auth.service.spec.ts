import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { type Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  const compareMock = bcrypt.compare as unknown as jest.Mock<Promise<boolean>>;
  let authService: AuthService;
  let usersRepository: {
    createQueryBuilder: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeEach(() => {
    usersRepository = {
      createQueryBuilder: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };
    authService = new AuthService(
      usersRepository as unknown as Repository<User>,
      jwtService as unknown as JwtService,
    );
    jest.clearAllMocks();
  });

  it('returns an access token for valid credentials', async () => {
    const user = {
      id: 'user-id',
      email: 'admin@example.com',
      password: 'hashed-password',
      fullName: 'Administrator',
    } as User;
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    compareMock.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('signed-token');

    const result = await authService.login({
      email: ' Admin@Example.com ',
      password: 'correct-password',
    });

    expect(queryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
      email: 'admin@example.com',
    });
    expect(compareMock).toHaveBeenCalledWith(
      'correct-password',
      'hashed-password',
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'admin@example.com',
      fullName: 'Administrator',
    });
    expect(result).toEqual({ access_token: 'signed-token' });
  });

  it('rejects an unknown user', async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(
      authService.login({
        email: 'unknown@example.com',
        password: 'password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(compareMock).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password', async () => {
    const user = {
      id: 'user-id',
      email: 'admin@example.com',
      password: 'hashed-password',
      fullName: 'Administrator',
    } as User;
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    compareMock.mockResolvedValue(false);

    await expect(
      authService.login({
        email: 'admin@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
