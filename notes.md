Payroll: When a payee is added, it uses prompt to display of success instead of a more matured notification like react toast. Fix this across all pages. implement toast.
Added payee do not reflect on page and i noticed no contract interaction. So blockchange state do not change. is UI actually interacting with the blockchain?

Dashboard, the payee does not also display in the dashboard.
The Payroll Automation, the three buttons are overflowing. Make them fit to the page.

x402 integration, What needs to be done:

Connect UI to x402 APIs - Call /api/x402/challenge after creating payment requests

Implement x402 payment flow - Actually use the challenges

Integrate with x402 facilitator - Use Cronos' official facilitator

Handle settlement - Call /api/x402/settle when payments complete

Fix all issues. Provide FULL codes for pages affected

