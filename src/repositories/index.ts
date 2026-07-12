import { AuthRepository } from './auth.repository';
import { OperationsRepository } from './operations.repository';
import { TenantRepository } from './tenant.repository';
import { BillingRepository } from './billing.repository';
import { PassengerRepository } from './passenger.repository';
import { SyncRepository } from './sync.repository';

export {
  AuthRepository,
  OperationsRepository,
  TenantRepository,
  BillingRepository,
  PassengerRepository,
  SyncRepository,
};

export const repositories = [
  AuthRepository,
  OperationsRepository,
  TenantRepository,
  BillingRepository,
  PassengerRepository,
  SyncRepository,
];
