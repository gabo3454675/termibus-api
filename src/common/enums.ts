/** @deprecated Usar OrganizationRole y TerminalRole en el modelo SaaS */
export enum Rol {
  ADMIN = 'ADMIN',
  DESPACHADOR = 'DESPACHADOR',
  CONDUCTOR = 'CONDUCTOR',
}

export enum OrganizationRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  BILLING_ADMIN = 'BILLING_ADMIN',
  MEMBER = 'MEMBER',
}

export enum TerminalRole {
  DESPACHADOR = 'DESPACHADOR',
  VIEWER = 'VIEWER',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  VOID = 'VOID',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum PlanResource {
  TERMINALES = 'TERMINALES',
  USUARIOS = 'USUARIOS',
  ANDENES = 'ANDENES',
  DESPACHOS_MES = 'DESPACHOS_MES',
  LINEAS = 'LINEAS',
  UNIDADES = 'UNIDADES',
}

export enum PlanCode {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum EstadoUnidad {
  DISPONIBLE = 'DISPONIBLE',
  EN_RUTA = 'EN_RUTA',
  EN_MANTENIMIENTO = 'EN_MANTENIMIENTO',
  RETIRADA = 'RETIRADA',
}

export enum EstadoAnden {
  LIBRE = 'LIBRE',
  OCUPADO = 'OCUPADO',
  FUERA_SERVICIO = 'FUERA_SERVICIO',
}

export enum EstadoDespacho {
  EN_COLA = 'EN_COLA',
  ASIGNADO = 'ASIGNADO',
  EN_ANDEN = 'EN_ANDEN',
  DESPACHADO = 'DESPACHADO',
  EN_RUTA = 'EN_RUTA',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
  RETRASADO = 'RETRASADO',
}

export enum TipoUnidad {
  BUS = 'BUS',
  MICROBUS = 'MICROBUS',
  VAN = 'VAN',
}

export enum EstadoAbordaje {
  RESERVADO = 'RESERVADO',
  ABORDADO = 'ABORDADO',
  CANCELADO = 'CANCELADO',
}

/** Cómo se originó el registro de abordaje */
export enum OrigenAbordaje {
  /** El pasajero mostró su QR (identificado) */
  QR = 'QR',
  /** El cobrador registró el abordaje manualmente (sin app o sin identidad) */
  MANUAL = 'MANUAL',
}

/** Método de pago del pasaje — el cobro ocurre al abordar */
export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  PAGO_MOVIL = 'PAGO_MOVIL',
  PUNTO_DE_VENTA = 'PUNTO_DE_VENTA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  EXONERADO = 'EXONERADO',
}

export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
  ANULADO = 'ANULADO',
}
