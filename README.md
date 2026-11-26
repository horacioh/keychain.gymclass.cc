# BJJ Keychain

A bilingual Astro storefront for 3D-printed BJJ belt keychains, with Stripe-hosted Checkout through a Cloudflare Pages Function. No Stripe SDK or database is required.

## Local development

```sh
bun install
bun run build
cp .dev.vars.example .dev.vars
npx wrangler pages dev dist
```

Use `bun run dev` to work on the static storefront without the checkout function. Run `bun run check` for type checking and `bun run test` for checkout tests. Keep `.dev.vars` untracked; set real secrets only in your local environment or Cloudflare’s bindings.

## Stripe setup

1. In Stripe test mode, create one product for each belt colour (white, blue, purple, brown, black) and a sixth product for the five-belt bundle.
2. Give each product a one-time EUR Price and copy its **Price ID** (starting with `price_`, not the Product ID). Set `STRIPE_PRICE_WHITE`, `STRIPE_PRICE_BLUE`, `STRIPE_PRICE_PURPLE`, `STRIPE_PRICE_BROWN`, `STRIPE_PRICE_BLACK`, and `STRIPE_PRICE_BUNDLE` to the matching IDs.
3. Set `STRIPE_SECRET_KEY` to the matching Stripe-mode secret key. Use a test key for local and preview environments.
4. The displayed prices in `src/config/products.ts` are **TODO: €12 for one belt and €50 for the bundle**. Check these before launch and keep them in sync with Stripe. The server sends Stripe only the configured Price IDs and quantities. Stripe’s prices determine the actual charge.

Checkout offers free hand delivery at the academy or €5 shipping to peninsular Spain. Stripe collects a phone number and a Spanish shipping address whichever option is picked. The country filter accepts all Spanish addresses; verify that the destination is in peninsular Spain before capturing an order with shipping.

## Reviewing an order

Stripe authorizes payment at checkout; it does not capture payment automatically. Find the payment in the Stripe Dashboard and check the items and delivery details:

- **Accept:** click **Capture** to charge the authorized payment and fulfil the order.
- **Reject:** click **Cancel** (sometimes **Cancel payment**) to release the authorization without charging the customer.

An authorization may appear as a pending hold on the customer’s account. Stripe shows its expiration on the payment; review orders before the hold expires. The thank-you page is a customer-facing acknowledgement, not proof of payment or a replacement for checking the Dashboard.

## Deploy to Cloudflare Pages

Use the `keychain-gymclass` Pages project for the `horacioh/keychain.gymclass.cc` GitHub repository. Use the project root as the build root, `bun run build` as the build command, and `dist` as the output directory. Keep the root `functions/` directory beside that output so Pages includes the checkout function. For a manual deploy, build locally and run `npx wrangler pages deploy dist` from the project root.

Add the seven Stripe bindings above in the Pages project’s **Settings → Variables and Secrets**. Set preview and production independently, using production-mode Stripe Prices and secret only in production. Attach `keychain.gymclass.cc` under **Custom domains** and verify a full Stripe test-mode checkout before switching production to live mode.
