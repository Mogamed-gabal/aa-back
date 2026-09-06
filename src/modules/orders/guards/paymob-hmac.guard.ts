import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PaymobService,
  type PaymobWebhookPayload,
} from '../../../shared/paymob/paymob.service';

@Injectable()
export class PaymobHmacGuard implements CanActivate {
  constructor(private readonly paymob: PaymobService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ body: PaymobWebhookPayload }>();
    if (!this.paymob.verifyHmac(request.body ?? {}))
      throw new UnauthorizedException('Invalid Paymob HMAC');
    return true;
  }
}
