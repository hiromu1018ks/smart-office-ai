/**
 * Tests for TypeScript type definitions and constants for authentication.
 *
 * TDD Phase: RED -> GREEN
 * These tests verify that all required types and constants are properly exported.
 */

import { describe, it, expect } from 'vitest'

// Import the types and constants we're testing
import type {
  User,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  TOTPSetupResponse,
  TOTPEnableRequest,
  TOTPVerifyRequest,
  TOTPVerifyResponse,
  TOTPEnableResponse,
  ApiError,
  AuthState,
  AuthPersistedState,
  ApiRequestState,
} from './types'
import {
  TOKEN_STORAGE_KEY,
  TOKEN_PREFIX,
  AUTH_STORAGE_KEY,
} from './types'

describe('Types & Constants', () => {
  describe('Type exports', () => {
    it('should export User type', () => {
      // This test verifies the User type exists and can be used
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        totp_enabled: false,
      }
      expect(user.id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(user.email).toBe('test@example.com')
      expect(user.username).toBe('testuser')
      expect(user.is_active).toBe(true)
      expect(user.totp_enabled).toBe(false)
    })

    it('should export LoginRequest type', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123',
      }
      expect(loginRequest.email).toBe('test@example.com')
      expect(loginRequest.password).toBe('Password123')

      // Test with optional TOTP code
      const loginWithTOTP: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123',
        totp_code: '123456',
      }
      expect(loginWithTOTP.totp_code).toBe('123456')
    })

    it('should export RegisterRequest type', () => {
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
      }
      expect(registerRequest.email).toBe('test@example.com')
      expect(registerRequest.username).toBe('testuser')
      expect(registerRequest.password).toBe('Password123')
    })

    it('should export TokenResponse type', () => {
      const tokenResponse: TokenResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        token_type: 'bearer',
        expires_in: 1800,
      }
      expect(tokenResponse.access_token).toBeDefined()
      expect(tokenResponse.token_type).toBe('bearer')
      expect(tokenResponse.expires_in).toBe(1800)
    })

    it('should export TOTPSetupResponse type', () => {
      const totpSetup: TOTPSetupResponse = {
        secret: 'JBSWY3DPEHPK3PXP',
        qr_code_uri: 'otpauth://totp/Example:testuser?secret=JBSWY3DPEHPK3PXP',
      }
      expect(totpSetup.secret).toBe('JBSWY3DPEHPK3PXP')
      expect(totpSetup.qr_code_uri).toContain('otpauth://totp')
    })

    it('should export TOTPEnableRequest type', () => {
      const totpEnable: TOTPEnableRequest = {
        secret: 'JBSWY3DPEHPK3PXP',
        code: '123456',
      }
      expect(totpEnable.secret).toBe('JBSWY3DPEHPK3PXP')
      expect(totpEnable.code).toBe('123456')
    })

    it('should export TOTPVerifyRequest type', () => {
      const totpVerify: TOTPVerifyRequest = {
        code: '123456',
      }
      expect(totpVerify.code).toBe('123456')
    })

    it('should export TOTPVerifyResponse type', () => {
      const totpVerifyResponse: TOTPVerifyResponse = {
        verified: true,
        message: 'TOTP code verified successfully',
      }
      expect(totpVerifyResponse.verified).toBe(true)
      expect(totpVerifyResponse.message).toBe('TOTP code verified successfully')
    })

    it('should export TOTPEnableResponse type', () => {
      const totpEnableResponse: TOTPEnableResponse = {
        enabled: true,
        message: 'Two-factor authentication enabled successfully',
      }
      expect(totpEnableResponse.enabled).toBe(true)
      expect(totpEnableResponse.message).toContain('enabled')
    })

    it('should export ApiError type', () => {
      const apiError: ApiError = {
        detail: 'An error occurred',
      }
      expect(apiError.detail).toBe('An error occurred')

      const apiErrorCode: ApiError = {
        detail: 'An error occurred',
        code: 'VALIDATION_ERROR',
      }
      expect(apiErrorCode.code).toBe('VALIDATION_ERROR')
    })

    it('should export AuthState type', () => {
      const user: User = {
        id: 'test-id',
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        totp_enabled: false,
      }

      const authState: AuthState = {
        user,
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }
      expect(authState.user).toEqual(user)
      expect(authState.token).toBe('test-token')
      expect(authState.isAuthenticated).toBe(true)
      expect(authState.isLoading).toBe(false)
      expect(authState.error).toBeNull()
    })

    it('should export AuthPersistedState type', () => {
      const persistedState: AuthPersistedState = {
        token: 'test-token',
      }
      expect(persistedState.token).toBe('test-token')

      const emptyState: AuthPersistedState = {
        token: null,
      }
      expect(emptyState.token).toBeNull()
    })

    it('should export ApiRequestState type', () => {
      const requestState: ApiRequestState<string> = {
        data: 'test data',
        isLoading: false,
        error: null,
      }
      expect(requestState.data).toBe('test data')
      expect(requestState.isLoading).toBe(false)
      expect(requestState.error).toBeNull()
    })
  })

  describe('Constants', () => {
    it('should export TOKEN_STORAGE_KEY as "soai-token"', () => {
      expect(TOKEN_STORAGE_KEY).toBe('soai-token')
    })

    it('should export TOKEN_PREFIX as "Bearer"', () => {
      expect(TOKEN_PREFIX).toBe('Bearer')
    })

    it('should export AUTH_STORAGE_KEY as "soai-auth-state"', () => {
      expect(AUTH_STORAGE_KEY).toBe('soai-auth-state')
    })
  })

  describe('Type structure validation', () => {
    it('should User have all required fields', () => {
      const minimalUser: User = {
        id: 'test-id',
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        totp_enabled: false,
      }

      // Verify all required fields exist
      expect(minimalUser.id).toBeDefined()
      expect(minimalUser.email).toBeDefined()
      expect(minimalUser.username).toBeDefined()
      expect(minimalUser.is_active).toBeDefined()
      expect(minimalUser.totp_enabled).toBeDefined()
    })

    it('should TokenResponse have all required fields', () => {
      const tokenResponse: TokenResponse = {
        access_token: 'token',
        token_type: 'bearer',
        expires_in: 1800,
      }

      expect(tokenResponse.access_token).toBe('token')
      expect(tokenResponse.token_type).toBe('bearer')
      expect(tokenResponse.expires_in).toBe(1800)
    })

    it('should TOTPSetupResponse have secret and qr_code_uri', () => {
      const totpSetup: TOTPSetupResponse = {
        secret: 'SECRET123',
        qr_code_uri: 'otpauth://totp/test',
      }

      expect('secret' in totpSetup).toBe(true)
      expect('qr_code_uri' in totpSetup).toBe(true)
    })

    it('should LoginRequest totp_code be optional', () => {
      const loginWithoutTOTP: LoginRequest = {
        email: 'test@example.com',
        password: 'password',
      }

      const loginWithTOTP: LoginRequest = {
        email: 'test@example.com',
        password: 'password',
        totp_code: '123456',
      }

      expect(loginWithoutTOTP.totp_code).toBeUndefined()
      expect(loginWithTOTP.totp_code).toBe('123456')
    })

    it('should ApiError code be optional', () => {
      const errorWithoutCode: ApiError = {
        detail: 'Error message',
      }

      const errorWithCode: ApiError = {
        detail: 'Error message',
        code: 'ERROR_CODE',
      }

      expect(errorWithoutCode.code).toBeUndefined()
      expect(errorWithCode.code).toBe('ERROR_CODE')
    })
  })
})
