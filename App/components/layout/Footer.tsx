// components/layout/Footer.tsx
import { Container } from './Container'
import { Github, Twitter, MessageCircle, ExternalLink } from 'lucide-react'
import Image from 'next/image';

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-gray-900 bg-black/90 backdrop-blur-sm">
      <Container>
        <div className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600">
                  <div className="h-14 w-14 text-white">
                  <Image
                    src="/logo3.png" // Path relative to the public directory
                    width={40}
                    height={40}
                    alt="Picture of the author"
                   
                  />

                  </div>
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
              <div className="flex space-x-3">
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

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="/dashboard"
                    className="text-gray-400 hover:text-white transition-colors flex items-center"
                  >
                    Dashboard
                  </a>
                </li>
                <li>
                  <a
                    href="/payroll"
                    className="text-gray-400 hover:text-white transition-colors flex items-center"
                  >
                    Payroll
                  </a>
                </li>
                <li>
                  <a
                    href="/analytics"
                    className="text-gray-400 hover:text-white transition-colors flex items-center"
                  >
                    Analytics
                  </a>
                </li>
                <li>
                  <a
                    href="/fund"
                    className="text-gray-400 hover:text-white transition-colors flex items-center"
                  >
                    Fund Treasury
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
                    className="text-gray-400 hover:text-white transition-colors flex items-center"
                  >
                    x402 Docs
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/cronos-labs/x402-examples"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors flex items-center"
                  >
                    Examples
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://cronos.org/explorer/testnet3/address/0x084622e6970BBcBA510454C6145313c2993ED9E4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors flex items-center"
                  >
                    Contract
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://cronos.org/faucet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors flex items-center"
                  >
                    Testnet Faucet
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Contract Info */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Contract</h3>
              <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Treasury Manager</div>
                <div className="font-mono text-xs text-white break-all">
                  0x084622e6970BBcBA510454C6145313c2993ED9E4
                </div>
                <a
                  href="https://cronos.org/explorer/testnet3/address/0x084622e6970BBcBA510454C6145313c2993ED9E4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-primary-400 hover:text-primary-300 mt-2"
                >
                  View on Explorer
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-sm text-gray-500">
                © {currentYear} DynamixPay. Built for Cronos x402 Hackathon.
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Testnet Only</span>
                <span>•</span>
                <span>Version 1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  )
}