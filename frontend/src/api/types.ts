import type { components } from './schema'

/** Atalhos para os schemas gerados do contrato da API (docs/api/openapi.json). */
type Schemas = components['schemas']

export type User = Schemas['UserRead']
export type UserRole = Schemas['UserRole']
export type Business = Schemas['BusinessRead']
export type LoginRequest = Schemas['LoginRequest']
export type LoginResponse = Schemas['LoginResponse']
export type MeResponse = Schemas['MeResponse']

export type Category = Schemas['CategoryRead']
export type CategoryCreate = Schemas['CategoryCreate']
export type CategoryUpdate = Schemas['CategoryUpdate']
export type Product = Schemas['ProductRead']
export type ProductCreate = Schemas['ProductCreate']
export type ProductUpdate = Schemas['ProductUpdate']

export type CashSession = Schemas['CashSessionRead']
export type CashSummary = Schemas['CashSummary']
export type CurrentCashSession = Schemas['CurrentCashSession']
export type CashMovement = Schemas['CashMovementRead']
export type CashMovementKind = Schemas['CashMovementKind']
