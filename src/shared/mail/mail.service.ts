import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { type Configuration } from '../../config/configuration';

export interface CourseDeliveryMail {
  customerName: string;
  email: string;
  orderNumber: string;
  courseTitle: string;
  driveFolderUrl: string;
  amount: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  constructor(private readonly config: ConfigService<Configuration>) {
    const user = config.get('mail.gmailUser', { infer: true });
    const password = config.get('mail.gmailAppPassword', { infer: true });
    this.transporter =
      user && password
        ? nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass: password },
          })
        : null;
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendCourseDelivery(mail: CourseDeliveryMail): Promise<void> {
    if (!this.transporter) throw new Error('Gmail SMTP is not configured');
    const from = this.config.get('mail.gmailUser', { infer: true });
    await this.transporter.sendMail({
      from,
      to: mail.email,
      subject: `تفاصيل طلبك ${mail.orderNumber} - رابط الكورس`,
      text: `مرحباً ${mail.customerName}\n\nتم تأكيد شراء الكورس: ${mail.courseTitle}\nرقم الطلب: ${mail.orderNumber}\nالإجمالي: ${mail.amount}\nرابط المحتوى: ${mail.driveFolderUrl}\n\nشكراً لثقتك بنا.`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif"><h2>تم تأكيد طلبك</h2><p>مرحباً ${mail.customerName}،</p><p>تم تأكيد شراء الكورس: <strong>${mail.courseTitle}</strong></p><p>رقم الطلب: ${mail.orderNumber}<br>الإجمالي: ${mail.amount}</p><p><a href="${mail.driveFolderUrl}">فتح محتوى الكورس</a></p><p>شكراً لثقتك بنا.</p></div>`,
    });
    this.logger.log(`Course delivery email sent for order ${mail.orderNumber}`);
  }
}
