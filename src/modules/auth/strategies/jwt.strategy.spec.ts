import { ConfigService } from '@nestjs/config';
import { type Configuration } from '../../../config/configuration';
import { JwtStrategy, type JwtPayload } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('returns the validated JWT payload', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
    } as unknown as ConfigService<Configuration>;
    const strategy = new JwtStrategy(configService);
    const payload: JwtPayload = {
      sub: 'user-id',
      email: 'admin@example.com',
      fullName: 'Administrator',
    };

    expect(strategy.validate(payload)).toEqual(payload);
  });
});
