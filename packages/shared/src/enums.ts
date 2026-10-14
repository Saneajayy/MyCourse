export const UserRole = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  BANNED: 'BANNED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const ProductStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const LessonStatus = {
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
} as const;
export type LessonStatus = (typeof LessonStatus)[keyof typeof LessonStatus];

export const OrderStatus = {
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const RefundStatus = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const EntitlementStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
export type EntitlementStatus = (typeof EntitlementStatus)[keyof typeof EntitlementStatus];

export const EntitlementSource = {
  PURCHASE: 'PURCHASE',
  ADMIN_GRANT: 'ADMIN_GRANT',
  COUPON_100: 'COUPON_100',
} as const;
export type EntitlementSource = (typeof EntitlementSource)[keyof typeof EntitlementSource];

export const CouponType = {
  PERCENT: 'PERCENT',
  FLAT: 'FLAT',
} as const;
export type CouponType = (typeof CouponType)[keyof typeof CouponType];

export const WebhookEventStatus = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  IGNORED: 'IGNORED',
} as const;
export type WebhookEventStatus = (typeof WebhookEventStatus)[keyof typeof WebhookEventStatus];

export const AuditAction = {
  USER_REGISTER: 'USER_REGISTER',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_BAN: 'USER_BAN',
  USER_UNBAN: 'USER_UNBAN',
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  PRODUCT_ARCHIVE: 'PRODUCT_ARCHIVE',
  ORDER_CREATE: 'ORDER_CREATE',
  ORDER_PAID: 'ORDER_PAID',
  PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  REFUND_INITIATED: 'REFUND_INITIATED',
  REFUND_PROCESSED: 'REFUND_PROCESSED',
  ACCESS_GRANTED: 'ACCESS_GRANTED',
  ACCESS_EXTENDED: 'ACCESS_EXTENDED',
  ACCESS_REVOKED: 'ACCESS_REVOKED',
  COUPON_CREATED: 'COUPON_CREATED',
  COUPON_REDEEMED: 'COUPON_REDEEMED',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
