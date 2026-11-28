import { createElement as h, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Drawer } from 'vaul';

interface ProductDrawerProps {
  dialog: HTMLDialogElement;
  content: HTMLElement;
  trigger: HTMLButtonElement;
  mobile: MediaQueryList;
  dispose: () => void;
}

function ProductDrawer({ dialog, content, trigger, mobile, dispose }: ProductDrawerProps) {
  const [open, setOpen] = useState(false);
  const close = content.querySelector<HTMLButtonElement>('[data-close-details]')!;
  const title = content.querySelector('h2')!.textContent;
  const description = content.querySelector('.product-dialog-body p')!.textContent;

  useEffect(() => {
    setOpen(true);
    const onResize = () => { if (!mobile.matches) setOpen(false); };
    mobile.addEventListener('change', onResize);
    onResize();
    return () => mobile.removeEventListener('change', onResize);
  }, [mobile]);

  const attachContent = useCallback((target: HTMLDivElement | null) => {
    if (!target) return;
    // Move the existing gallery and controls so their listeners and cart state stay intact.
    target.append(content);
    const sheet = target.parentElement!;
    trigger.setAttribute('aria-controls', sheet.id);
    const updateScrollability = () => sheet.toggleAttribute('data-scrollable', sheet.scrollHeight > sheet.clientHeight);
    const observer = new ResizeObserver(updateScrollability);
    observer.observe(sheet);
    observer.observe(target);
    updateScrollability();
    return () => {
      observer.disconnect();
      dialog.append(content);
      trigger.setAttribute('aria-controls', dialog.id);
    };
  }, [content, dialog, trigger]);

  return h(Drawer.Root, {
    open,
    onOpenChange: setOpen,
    closeThreshold: 0.28,
    scrollLockTimeout: 100,
    autoFocus: true,
  }, h(Drawer.Portal, null,
    h(Drawer.Overlay, { className: 'product-drawer-overlay' }),
    h(Drawer.Content, {
      className: 'product-drawer',
      onCloseAutoFocus: (event) => {
        event.preventDefault();
        trigger.focus({ preventScroll: true });
        queueMicrotask(dispose);
      },
    },
    h('div', { className: 'product-drawer-handle', 'aria-hidden': true }),
    h(Drawer.Close, {
      className: 'product-dialog-close product-drawer-close',
      'aria-label': close.getAttribute('aria-label') ?? undefined,
    }, close.textContent),
    h(Drawer.Title, { className: 'sr-only' }, title),
    h(Drawer.Description, { className: 'sr-only' }, description),
    h('div', { ref: attachContent })),
  ));
}

let drawerOpen = false;

export function openProductDrawer(dialog: HTMLDialogElement, trigger: HTMLButtonElement, mobile: MediaQueryList) {
  if (drawerOpen) return;
  drawerOpen = true;
  const content = dialog.querySelector<HTMLElement>('.product-dialog-content')!;
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  root.render(h(ProductDrawer, {
    dialog, content, trigger, mobile,
    dispose: () => {
      root.unmount();
      host.remove();
      drawerOpen = false;
    },
  }));
}
