import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { type Configuration } from '../../config/configuration';

export interface PaymobWebhookObject {
  amount_cents?: unknown;
  created_at?: unknown;
  currency?: unknown;
  error_occured?: unknown;
  has_parent_transaction?: unknown;
  id?: unknown;
  integration_id?: unknown;
  is_3d_secure?: unknown;
  is_auth?: unknown;
  is_capture?: unknown;
  is_refunded?: unknown;
  is_standalone_payment?: unknown;
  is_voided?: unknown;
  order?: { id?: unknown };
  owner?: unknown;
  pending?: unknown;
  source_data?: { pan?: unknown; sub_type?: unknown; type?: unknown };
  success?: unknown;
}
export interface PaymobWebhookPayload {
  hmac?: unknown;
  obj?: PaymobWebhookObject;
  order_id?: unknown;
}
export interface PaymobPaymentResult {
  paymobOrderId: string;
  checkoutUrl: string;
}

function primitiveString(value: unknown): string {
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? String(value)
    : '';
}

@Injectable()
export class PaymobService {
  private readonly baseUrl = 'https://accept.paymob.com/api';
  constructor(private readonly config: ConfigService<Configuration>) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get('paymob.apiKey', { infer: true }) &&
      this.config.get('paymob.integrationId', { infer: true }) &&
      this.config.get('paymob.iframeId', { infer: true }) &&
      this.config.get('paymob.hmacSecret', { infer: true }),
    );
  }

  verifyHmac(payload: PaymobWebhookPayload): boolean {
    const secret = this.config.get('paymob.hmacSecret', { infer: true }) ?? '';
    const supplied = primitiveString(payload.hmac);
    if (!secret || !supplied) return false;
    const obj = payload.obj ?? {};
    const values: unknown[] = [
      obj.amount_cents,
      obj.created_at,
      obj.currency,
      obj.error_occured,
      obj.has_parent_transaction,
      obj.id,
      obj.integration_id,
      obj.is_3d_secure,
      obj.is_auth,
      obj.is_capture,
      obj.is_refunded,
      obj.is_standalone_payment,
      obj.is_voided,
      obj.order?.id,
      obj.owner,
      obj.pending,
      obj.source_data?.pan,
      obj.source_data?.sub_type,
      obj.source_data?.type,
      obj.success,
    ];
    const digest = createHmac('sha512', secret)
      .update(values.map(primitiveString).join(''))
      .digest('hex');
    const a = Buffer.from(digest, 'utf8');
    const b = Buffer.from(supplied, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async createPayment(
    orderNumber: string,
    totalAmount: string,
    email: string | null,
    firstName: string,
  ): Promise<PaymobPaymentResult> {
    if (!this.isConfigured())
      throw new BadGatewayException('Paymob is not configured');
    const apiKey = this.config.getOrThrow('paymob.apiKey', { infer: true });
    const integrationId = this.config.getOrThrow('paymob.integrationId', {
      infer: true,
    });
    const iframeId = this.config.getOrThrow('paymob.iframeId', { infer: true });
    const auth = await this.request<{ token: string }>('/auth/tokens', {
      api_key: apiKey,
    });
    const amountCents = Math.round(Number(totalAmount) * 100);
    const registered = await this.request<{ id: number }>('/ecommerce/orders', {
      auth_token: auth.token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: 'EGP',
      merchant_order_id: orderNumber,
      items: [],
    });
    const key = await this.request<{ token: string }>(
      '/acceptance/payment_keys',
      {
        auth_token: auth.token,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: registered.id,
        billing_data: {
          first_name: firstName,
          last_name: 'Customer',
          email: email ?? 'customer@example.com',
          phone_number: 'NA',
          apartment: 'NA',
          floor: 'NA',
          street: 'NA',
          building: 'NA',
          shipping_method: 'NA',
          postal_code: 'NA',
          city: 'NA',
          country: 'EG',
          state: 'NA',
        },
        currency: 'EGP',
        integration_id: Number(integrationId),
      },
    );
    return {
      paymobOrderId: String(registered.id),
      checkoutUrl: `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${encodeURIComponent(key.token)}`,
    };
  }

  private async request<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok)
      throw new BadGatewayException(
        `Paymob request failed (${response.status})`,
      );
    return response.json() as Promise<T>;
  }
}
