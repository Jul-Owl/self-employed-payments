import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentLinkDto } from './create-payment-link.dto';

export class UpdatePaymentLinkDto extends PartialType(CreatePaymentLinkDto) {}
