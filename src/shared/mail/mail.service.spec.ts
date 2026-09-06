import { type ConfigService } from '@nestjs/config';
import { type Configuration } from '../../config/configuration';
import { MailService } from './mail.service';

describe('MailService', () => {
  it('reports Gmail as unconfigured and rejects delivery without credentials', async () => {
    const config = {
      get: jest.fn().mockReturnValue(''),
    } as unknown as ConfigService<Configuration>;
    const service = new MailService(config);
    expect(service.isConfigured()).toBe(false);
    await expect(
      service.sendCourseDelivery({
        customerName: 'Test',
        email: 'test@example.com',
        orderNumber: 'ORD-1',
        courseTitle: 'Course',
        driveFolderUrl: 'https://drive.google.com/x',
        amount: '100.00',
      }),
    ).rejects.toThrow('Gmail SMTP is not configured');
  });
});
