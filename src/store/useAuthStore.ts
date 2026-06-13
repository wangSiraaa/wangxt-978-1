import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { storage } from '../utils/storage'

export type AuthRole = 'staff' | 'customer' | 'manager' | 'cashier' | null

export interface AuthUser {
  id: string
  name: string
  empId: string
}

interface AuthState {
  currentRole: AuthRole
  currentUser: AuthUser | null
}

interface AuthActions {
  login: (role: AuthRole, credentials?: { username?: string; password?: string }) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export type AuthStore = AuthState & AuthActions

const zustandStorage = {
  getItem: (name: string) => {
    const value = storage.get(name)
    return value !== null ? JSON.stringify(value) : null
  },
  setItem: (name: string, value: string) => {
    storage.set(name, JSON.parse(value))
  },
  removeItem: (name: string) => {
    storage.remove(name)
  },
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      currentRole: null,
      currentUser: null,

      login: (role, credentials) => {
        const mockUsers: Record<string, AuthUser> = {
          staff: { id: 'staff_001', name: '张员工', empId: 'EMP001' },
          customer: { id: 'cust_001', name: '李顾客', empId: 'CUS001' },
          manager: { id: 'manager_001', name: '王店长', empId: 'MGR001' },
          cashier: { id: 'cashier_001', name: '赵收银', empId: 'CSH001' },
        }
        set({
          currentRole: role,
          currentUser: role ? mockUsers[role] : null,
        })
      },

      logout: () => {
        set({
          currentRole: null,
          currentUser: null,
        })
      },

      isAuthenticated: () => {
        return get().currentRole !== null && get().currentUser !== null
      },
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)
