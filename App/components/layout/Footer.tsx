// components/layout/Footer.tsx
import { Container } from './Container'
import { Github, Twitter, MessageCircle } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-surface bg-background">
      <Container>
        <div className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600">
                  <div className="h-6 w-6 text-white">💰</div>
                </div>
                <div>
                  <span className="text-lg font-bold text-white">DynamixPay</span>
                  <span className="ml-2 text-xs font-medium text-primary-400 bg-primary-900/30 px-2 py-0.5 rounded">
                    x402
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                AI-powered payroll & treasury automation on Cronos
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="/dashboard"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Dashboard
                  </a>
                </li>
                <li>
                  <a
                    href="/payroll"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Payroll
                  </a>
                </li>
                <li>
                  <a
                    href="/analytics"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Analytics
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="https://docs.cronos.org/cronos-x402-facilitator/introduction"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    x402 Docs
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/cronos-labs/x402-examples"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Examples
                  </a>
                </li>
                <li>
                  <a
                    href="https://cronos.org/explorer/testnet3/address/0x084622e6970BBcBA510454C6145313c2993ED9E4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Contract
                  </a>
                </li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Connect</h3>
              <div className="flex space-x-4">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Github className="h-5 w-5" />
                </a>
                <a
                  href="https://twitter.com/cronos_chain"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="https://discord.com/invite/cronos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-8 pt-8 border-t border-surface">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-sm text-gray-500">
                © {currentYear} DynamixPay. Built for Cronos x402 Hackathon.
              </p>
              <div className="text-sm text-gray-500">
                Contract: 0x084622e6970BBcBA510454C6145313c2993ED9E4
              </div>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  )
}