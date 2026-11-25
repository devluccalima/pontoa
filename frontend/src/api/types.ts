import type { components } from './schema'

/** Atalhos para os schemas gerados do contrato da API (docs/api/openapi.json). */
type Schemas = components['schemas']

export type User = Schemas['UserRead']
export type UserRole = Schemas['UserRole']
export type Business = Schemas['BusinessRead']
export type LoginRequest = Schemas['LoginRequest']
export type LoginResponse = Schemas['LoginResponse']
export type MeResponse = Schemas['MeResponse']
