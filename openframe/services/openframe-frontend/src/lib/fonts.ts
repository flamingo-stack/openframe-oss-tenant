import { Azeret_Mono, DM_Sans } from 'next/font/google'

// Next.js requires font loader calls to be assigned to `const`.
export const azeretMono = Azeret_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-azeret-mono',
  weight: ['400', '500', '600', '700'],
})

export const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  weight: ['400', '500', '700'],
})


