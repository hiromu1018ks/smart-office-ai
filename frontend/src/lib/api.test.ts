/**
 * Tests for API client.
 *
 * TDD Phase: RED -> GREEN
 * These tests verify the API client handles authentication, requests, and errors correctly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock localStorage BEFORE importing api
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Stub localStorage globally before importing api
vi.stubGlobal('localStorage', localStorageMock)

// Mock axios BEFORE importing api
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      defaults: { headers: { common: {} } },
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
    post: vi.fn(),
    get: vi.fn(),
  },
}))

// Import the api functions after mocking
import {
  api,
  login,
  register,
  getCurrentUser,
  setupTOTP,
  enableTOTP,
  disableTOTP,
  verifyTOTP,
  setToken,
  getToken,
  clearToken,
  isAuthenticated,
} from './api'

describe('API Client', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    // Reset localStorage to return null by default
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Token Management', () => {
    describe('setToken', () => {
      it('should save token to localStorage', () => {
        const testToken = 'test-access-token'
        setToken(testToken)

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'soai-token',
          testToken
        )
      })

      it('should update axios default header', () => {
        const testToken = 'test-access-token'
        setToken(testToken)

        // Verify the Authorization header is set on the api instance
        expect(api.defaults.headers.common.Authorization).toBe(
          `Bearer ${testToken}`
        )
      })
    })

    describe('getToken', () => {
      it('should retrieve token from localStorage', () => {
        const testToken = 'test-access-token'
        localStorageMock.getItem.mockReturnValue(testToken)

        const token = getToken()
        expect(token).toBe(testToken)
        expect(localStorageMock.getItem).toHaveBeenCalledWith('soai-token')
      })

      it('should return null when no token exists', () => {
        localStorageMock.getItem.mockReturnValue(null)

        const token = getToken()
        expect(token).toBeNull()
      })
    })

    describe('clearToken', () => {
      it('should remove token from localStorage', () => {
        clearToken()

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('soai-token')
      })

      it('should clear axios default header', () => {
        // First set a token
        setToken('test-token')
        expect(api.defaults.headers.common.Authorization).toBeDefined()

        // Then clear it
        clearToken()
        expect(api.defaults.headers.common.Authorization).toBeUndefined()
      })
    })

    describe('isAuthenticated', () => {
      it('should return true when token exists', () => {
        localStorageMock.getItem.mockReturnValue('valid-token')

        expect(isAuthenticated()).toBe(true)
      })

      it('should return false when no token exists', () => {
        localStorageMock.getItem.mockReturnValue(null)

        expect(isAuthenticated()).toBe(false)
      })

      it('should return false when token is empty string', () => {
        localStorageMock.getItem.mockReturnValue('')

        expect(isAuthenticated()).toBe(false)
      })
    })
  })

  describe('Auth Endpoints', () => {
    describe('login', () => {
      const mockCredentials = {
        email: 'test@example.com',
        password: 'Password123',
      }

      it('should successfully login with valid credentials', async () => {
        const mockResponse = {
          access_token: 'jwt-token',
          token_type: 'bearer' as const,
          expires_in: 1800,
        }

        vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

        const result = await login(mockCredentials)

        expect(result).toEqual(mockResponse)
        expect(api.post).toHaveBeenCalledWith(
          '/v1/auth/login',
          mockCredentials
        )
      })

      it('should login with TOTP code when provided', async () => {
        const credentialsWithTOTP = {
          ...mockCredentials,
          totp_code: '123456',
        }

        const mockResponse = {
          access_token: 'jwt-token',
          token_type: 'bearer' as const,
          expires_in: 1800,
        }

        vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

        const result = await login(credentialsWithTOTP)

        expect(result).toEqual(mockResponse)
        expect(api.post).toHaveBeenCalledWith(
          '/v1/auth/login',
          credentialsWithTOTP
        )
      })

      it('should throw error with invalid credentials', async () => {
        const mockError = {
          response: {
            data: {
              detail: 'Invalid email or password',
            },
            status: 401,
          },
        }

        vi.mocked(api.post).mockRejectedValue(mockError)

        await expect(login(mockCredentials)).rejects.toThrow('Invalid email or password')
      })

      it('should throw error when TOTP is required but not provided', async () => {
        const mockError = {
          response: {
            data: {
              detail: 'TOTP code required',
            },
            status: 400,
          },
        }

        vi.mocked(api.post).mockRejectedValue(mockError)

        await expect(login(mockCredentials)).rejects.toThrow('TOTP code required')
      })

      it('should handle network errors', async () => {
        const networkError = new Error('Network Error')

        vi.mocked(api.post).mockRejectedValue(networkError)

        await expect(login(mockCredentials)).rejects.toThrow('Login failed')
      })
    })

    describe('register', () => {
      const mockUserData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
      }

      it('should successfully register new user', async () => {
        const mockResponse = {
          id: 'user-id',
          email: 'test@example.com',
          username: 'testuser',
          is_active: true,
          totp_enabled: false,
        }

        vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

        const result = await register(mockUserData)

        expect(result).toEqual(mockResponse)
        expect(api.post).toHaveBeenCalledWith(
          '/v1/auth/register',
          mockUserData
        )
      })

      it('should throw error when email already exists', async () => {
        const mockError = {
          response: {
            data: {
              detail: 'Email already registered',
            },
            status: 400,
          },
        }

        vi.mocked(api.post).mockRejectedValue(mockError)

        await expect(register(mockUserData)).rejects.toThrow('Email already registered')
      })

      it('should throw error when username already exists', async () => {
        const mockError = {
          response: {
            data: {
              detail: 'Username already taken',
            },
            status: 400,
          },
        }

        vi.mocked(api.post).mockRejectedValue(mockError)

        await expect(register(mockUserData)).rejects.toThrow('Username already taken')
      })
    })

    describe('getCurrentUser', () => {
      it('should return current user data when authenticated', async () => {
        const mockUser = {
          id: 'user-id',
          email: 'test@example.com',
          username: 'testuser',
          is_active: true,
          totp_enabled: false,
        }

        vi.mocked(api.get).mockResolvedValue({ data: mockUser })

        const result = await getCurrentUser()

        expect(result).toEqual(mockUser)
        expect(api.get).toHaveBeenCalledWith('/v1/auth/me')
      })

      it('should throw error when not authenticated', async () => {
        const mockError = {
          response: {
            data: {
              detail: 'Could not validate credentials',
            },
            status: 401,
          },
        }

        vi.mocked(api.get).mockRejectedValue(mockError)

        await expect(getCurrentUser()).rejects.toThrow('Could not validate credentials')
      })
    })
  })

  describe('TOTP Endpoints', () => {
    describe('setupTOTP', () => {
      it('should generate TOTP secret and QR code', async () => {
        const mockResponse = {
          secret: 'JBSWY3DPEHPK3PXP',
          qr_code_uri: 'otpauth://totp/Example:testuser?secret=JBSWY3DPEHPK3PXP',
        }

        vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

        const result = await setupTOTP()

        expect(result).toEqual(mockResponse)
        expect(api.post).toHaveBeenCalledWith('/v1/auth/2fa/setup')
      })
    })

    describe('enableTOTP', () => {
      it('should enable TOTP with valid code', async () => {
        const request = {
          secret: 'JBSWY3DPEHPK3PXP',
          code: '123456',
        }

        const mockResponse = {
          enabled: true,
          message: 'Two-factor authentication enabled successfully',
        }

        vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

        const result = await enableTOTP(request)

        expect(result).toEqual(mockResponse)
        expect(api.post).toHaveBeenCalledWith('/v1/auth/2fa/enable', request)
      })
    })

    describe('disableTOTP', () => {
      it('should disable TOTP with valid code', async () => {
        const request = {
          code: '123456',
        }

        const mockResponse = {
          enabled: false,
          message: 'Two-factor authentication disabled successfully',
        }

        vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

        const result = await disableTOTP(request)

        expect(result).toEqual(mockResponse)
        expect(api.post).toHaveBeenCalledWith('/v1/auth/2fa/disable', request)
      })
    })

    describe('verifyTOTP', () => {
      it('should verify valid TOTP code', async () => {
        const request = {
          code: '123456',
        }

        const mockResponse = {
          verified: true,
          message: 'TOTP code verified successfully',
        }

        vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

        const result = await verifyTOTP(request)

        expect(result).toEqual(mockResponse)
        expect(api.post).toHaveBeenCalledWith('/v1/auth/2fa/verify', request)
      })

      it('should return false for invalid TOTP code', async () => {
        const request = {
          code: '000000',
        }

        const mockResponse = {
          verified: false,
          message: 'Invalid TOTP code',
        }

        vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

        const result = await verifyTOTP(request)

        expect(result).toEqual(mockResponse)
        expect(result.verified).toBe(false)
      })
    })
  })
})
