import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      // Fixed URL so tests never depend on a developer's .env.local
      env: { VITE_API_URL: 'http://localhost:3000/api/v1' },
      restoreMocks: true,
      // Page tests render the whole app and drive it with userEvent; under a parallel
      // run with coverage they can need more than the 5s default.
      testTimeout: 20_000,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/components/ui/**', 'src/test/**', 'src/main.tsx', 'src/**/*.test.{ts,tsx}'],
      },
    },
  }),
)
