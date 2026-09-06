import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { type Configuration } from '../../config/configuration';
import { User } from './entities/user.entity';

@Injectable()
export class AuthSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService<Configuration>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.normalizeEmail(
      this.configService.getOrThrow('admin.email', { infer: true }),
    );
    const password = this.configService.getOrThrow('admin.password', {
      infer: true,
    });

    const existingAdmin = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingAdmin !== null) {
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = this.usersRepository.create({
      email,
      password: hashedPassword,
      fullName: 'Administrator',
    });

    await this.usersRepository.save(admin);
    this.logger.log(`Admin account seeded: ${email}`);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
