import { OpenPanel } from '@openpanel/sdk';

const clientId = import.meta.env.PUBLIC_OPENPANEL_CLIENT_ID?.trim();
const analytics = clientId ? new OpenPanel({ clientId, sdk: 'web' }) : undefined;
type Event = 'screen_view' | 'product_dialog_opened' | 'add_to_cart' | 'checkout_started';

export function trackOpenPanel(name: Event, properties: Record<string, string | number>) {
  void analytics?.track(name, properties).catch(() => {});
}
