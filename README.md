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

1. In Stripe test mode, create six individual products (white, blue, purple, brown, standard black, instructor black) and two five-belt bundle products: each includes white, blue, purple, and brown, plus either standard black or instructor black.
2. Give each product an active one-time EUR price and set it as the product's **default price**. The site uses the Product IDs (`prod_…`) in `src/config/products.ts`. For a different catalog, override them with the `STRIPE_PRODUCT_*` bindings listed in `.dev.vars.example`. The previous `STRIPE_PRICE_*` bindings are no longer used.
3. Set `STRIPE_SECRET_KEY` to the secret key for the same catalog and mode as those Product IDs. Use a test key for local and preview environments.
4. To change a price, create a new one-time EUR price in Stripe and set it as the product's default. No site edit, webhook or redeploy is needed.

The storefront starts with static fallback prices (€9 per standard belt, €11 for instructor black, €39 for the standard bundle, and €40 for the instructor bundle) and loads Stripe prices through `/api/prices`. A complete catalog is cached for five minutes. Each bundle shows the sum of its individual belt prices crossed out if that sum exceeds the bundle price. Checkout always checks the current Stripe defaults, and if a displayed price is stale, it updates the cart and asks the buyer to review it before starting payment.

Checkout offers free hand delivery at the academy or €5 shipping to peninsular Spain. Stripe collects a phone number and a Spanish shipping address whichever option is picked. The country filter accepts all Spanish addresses; verify that the destination is in peninsular Spain before capturing an order with shipping.

Checkout explicitly disables Stripe Managed Payments for this session (`managed_payments[enabled]=false`) because Managed Payments does not support the shipping address collection used here.

## Reviewing an order

Stripe authorizes payment at checkout; it does not capture payment automatically. Find the payment in the Stripe Dashboard and check the items and delivery details:

- **Accept:** click **Capture** to charge the authorized payment and fulfil the order.
- **Reject:** click **Cancel** (sometimes **Cancel payment**) to release the authorization without charging the customer.

An authorization may appear as a pending hold on the customer’s account. Stripe shows its expiration on the payment; review orders before the hold expires. The thank-you page is a customer-facing acknowledgement, not proof of payment or a replacement for checking the Dashboard.

## Deploy to Cloudflare Pages

Use the `keychain-gymclass` Pages project for the `horacioh/keychain.gymclass.cc` GitHub repository. Use the project root as the build root, `bun run build` as the build command, and `dist` as the output directory. Keep the root `functions/` directory beside that output so Pages includes the checkout function. For a manual deploy, build locally and run `npx wrangler pages deploy dist` from the project root.

Add `STRIPE_SECRET_KEY` and any product ID overrides in the Pages project’s **Settings → Variables and Secrets**. Set preview and production independently, using live-mode Stripe products and the live key only in production. Attach `keychain.gymclass.cc` under **Custom domains** and verify a full Stripe test-mode checkout before switching production to live mode.

To require agreement to the terms at Stripe Checkout, set the terms of service URL in the Stripe Dashboard’s public details first, then set the Pages runtime variable `STRIPE_REQUIRE_TERMS=true`. Leave the variable unset until the URL is configured; Stripe rejects the Checkout Session otherwise.

## OpenPanel analytics

- Set `PUBLIC_OPENPANEL_CLIENT_ID` at **build time** to the OpenPanel web client ID. For a direct upload, provide it when running `bun run build`; Cloudflare Pages runtime bindings do not set it for an already-built site. Allow the storefront origin in the OpenPanel web client settings. Omit this variable to disable browser analytics. A web client secret is not needed and must not enter the browser build.
- Set `OPENPANEL_CLIENT_ID` (backend client ID) and `OPENPANEL_CLIENT_SECRET` (backend client secret) as **Pages Functions runtime** bindings. Store the secret as encrypted. Both values are required for the background checkout event. Leave these bindings unset in environments that should not send checkout data.
