const DRAG_SLOP = 8;
const CLOSE_DISTANCE = 0.28;
const FLICK_VELOCITY = 0.4;
const VELOCITY_WINDOW = 100;
const RUBBER_BAND = 48;

interface Drag {
  pointerId: number;
  x: number;
  y: number;
  height: number;
  active: boolean;
  samples: { y: number; time: number }[];
}

export function setupProductDrawer(dialog: HTMLDialogElement, mobile: MediaQueryList) {
  let drag: Drag | undefined;

  function updateScrollState() {
    if (!dialog.open || !mobile.matches) return;
    dialog.toggleAttribute('data-sheet-scrollable', dialog.scrollHeight > dialog.clientHeight);
    dialog.toggleAttribute('data-sheet-scrolled', dialog.scrollTop > 0);
  }

  const observer = new ResizeObserver(updateScrollState);
  observer.observe(dialog);
  observer.observe(dialog.querySelector('.product-dialog-content')!);
  dialog.addEventListener('scroll', updateScrollState, { passive: true });

  function resetDrag() {
    const pointerId = drag?.pointerId;
    drag = undefined;
    if (pointerId !== undefined && dialog.hasPointerCapture(pointerId)) dialog.releasePointerCapture(pointerId);
    dialog.removeAttribute('data-sheet-dragging');
    dialog.style.removeProperty('--sheet-offset');
    dialog.style.removeProperty('--sheet-opacity');
  }

  function open() {
    dialog.showModal();
    updateScrollState();
  }

  function close() {
    if (!dialog.open || dialog.hasAttribute('data-sheet-closing')) return;
    if (!mobile.matches) {
      dialog.close();
      return;
    }
    dialog.setAttribute('data-sheet-closing', '');
    resetDrag();
    const slide = dialog.getAnimations().find(animation =>
      animation instanceof CSSTransition && animation.transitionProperty === 'transform');
    function finish() {
      dialog.close();
      dialog.removeAttribute('data-sheet-closing');
    }
    if (slide) void slide.finished.then(finish, finish);
    else finish();
  }

  mobile.addEventListener('change', () => {
    resetDrag();
    updateScrollState();
  });

  dialog.addEventListener('pointerdown', event => {
    if (!mobile.matches || !dialog.open || drag || !event.isPrimary || event.button !== 0 ||
        dialog.scrollTop > 0 || dialog.hasAttribute('data-sheet-closing')) return;
    if (!(event.target instanceof Element) || event.target.closest('button, a, input, select, textarea, [contenteditable]')) return;
    const { left, right, top, bottom, height } = dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) return;
    drag = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY, height, active: false,
      samples: [{ y: event.clientY, time: event.timeStamp }],
    };
  });

  dialog.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_SLOP) return;
      if (Math.abs(dx) >= Math.abs(dy) || dialog.scrollTop > 0) {
        resetDrag();
        return;
      }
      drag.active = true;
      dialog.setPointerCapture(event.pointerId);
      dialog.setAttribute('data-sheet-dragging', '');
    }
    const offset = dy < 0 ? RUBBER_BAND * dy / (RUBBER_BAND - dy) : Math.min(dy, drag.height);
    dialog.style.setProperty('--sheet-offset', `${offset}px`);
    dialog.style.setProperty('--sheet-opacity', String(1 - Math.max(0, offset) / drag.height));
    drag.samples = drag.samples.filter(sample => event.timeStamp - sample.time <= VELOCITY_WINDOW);
    drag.samples.push({ y: event.clientY, time: event.timeStamp });
  });

  dialog.addEventListener('pointerup', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dy = event.clientY - drag.y;
    const sample = drag.samples.find(sample => event.timeStamp - sample.time <= VELOCITY_WINDOW);
    const velocity = sample && event.timeStamp > sample.time
      ? (event.clientY - sample.y) / (event.timeStamp - sample.time) : 0;
    if (drag.active && dy > 0 && (dy >= drag.height * CLOSE_DISTANCE || velocity > FLICK_VELOCITY)) close();
    else resetDrag();
  });

  function cancelDrag(event: PointerEvent) {
    if (drag?.pointerId === event.pointerId) resetDrag();
  }
  dialog.addEventListener('pointercancel', cancelDrag);
  dialog.addEventListener('lostpointercapture', event => {
    if (event.target === dialog) cancelDrag(event);
  });

  return { open, close };
}
