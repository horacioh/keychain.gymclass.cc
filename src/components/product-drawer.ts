const DRAG_SLOP = 8;
const CLOSE_DISTANCE = 0.28;
const FLICK_VELOCITY = 0.4;
const VELOCITY_WINDOW = 100;
const RUBBER_BAND = 48;

interface Drag {
  source: 'pointer' | 'touch';
  id: number;
  x: number;
  y: number;
  height: number;
  allowUpward: boolean;
  active: boolean;
  samples: { y: number; time: number }[];
}

export function setupProductDrawer(dialog: HTMLDialogElement, mobile: MediaQueryList) {
  let drag: Drag | undefined;

  function resetDrag() {
    const pointerId = drag?.source === 'pointer' ? drag.id : undefined;
    drag = undefined;
    if (pointerId !== undefined && dialog.hasPointerCapture(pointerId)) dialog.releasePointerCapture(pointerId);
    dialog.removeAttribute('data-sheet-dragging');
    dialog.style.removeProperty('--sheet-offset');
    dialog.style.removeProperty('--sheet-opacity');
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

  mobile.addEventListener('change', resetDrag);

  function startDrag(source: Drag['source'], id: number, target: EventTarget | null, x: number, y: number, time: number) {
    if (!mobile.matches || !dialog.open || drag ||
        dialog.scrollTop > 0 || dialog.hasAttribute('data-sheet-closing')) return;
    if (!(target instanceof Element) || target.closest('button, a, input, select, textarea, [contenteditable]')) return;
    const { left, right, top, bottom, height } = dialog.getBoundingClientRect();
    if (x < left || x > right || y < top || y > bottom) return;
    drag = {
      source, id, x, y, height, active: false, samples: [{ y, time }],
      allowUpward: source === 'pointer' || !!target.closest('.product-sheet-handle') || dialog.scrollHeight <= dialog.clientHeight,
    };
  }

  function moveDrag(x: number, y: number, time: number, claimGesture: (active: boolean) => boolean) {
    if (!drag) return;
    const dx = x - drag.x;
    const dy = y - drag.y;
    if (!drag.active) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_SLOP) return;
      if (Math.abs(dx) >= Math.abs(dy) || dialog.scrollTop > 0 || (dy < 0 && !drag.allowUpward)) {
        resetDrag();
        return;
      }
    }
    if (!claimGesture(drag.active)) {
      resetDrag();
      return;
    }
    if (!drag.active) {
      drag.active = true;
      dialog.setAttribute('data-sheet-dragging', '');
    }
    const offset = dy < 0 ? RUBBER_BAND * dy / (RUBBER_BAND - dy) : Math.min(dy, drag.height);
    dialog.style.setProperty('--sheet-offset', `${offset}px`);
    dialog.style.setProperty('--sheet-opacity', String(1 - Math.max(0, offset) / drag.height));
    drag.samples = drag.samples.filter(sample => time - sample.time <= VELOCITY_WINDOW);
    drag.samples.push({ y, time });
  }

  function endDrag(y: number, time: number) {
    if (!drag) return;
    const dy = y - drag.y;
    const sample = drag.samples.find(sample => time - sample.time <= VELOCITY_WINDOW);
    const velocity = sample && time > sample.time ? (y - sample.y) / (time - sample.time) : 0;
    if (drag.active && dy > 0 && (dy >= drag.height * CLOSE_DISTANCE || velocity > FLICK_VELOCITY)) close();
    else resetDrag();
  }

  dialog.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) {
      if (drag?.source === 'touch') resetDrag();
      return;
    }
    const touch = event.changedTouches[0];
    if (touch) startDrag('touch', touch.identifier, touch.target, touch.clientX, touch.clientY, event.timeStamp);
  }, { passive: true });
  dialog.addEventListener('touchmove', event => {
    if (drag?.source !== 'touch') return;
    if (event.touches.length !== 1) {
      resetDrag();
      return;
    }
    const touch = Array.from(event.changedTouches).find(t => t.identifier === drag?.id);
    if (!touch) return;
    moveDrag(touch.clientX, touch.clientY, event.timeStamp, () => {
      if (!event.cancelable) return false;
      event.preventDefault();
      return true;
    });
  }, { passive: false });
  dialog.addEventListener('touchend', event => {
    if (drag?.source !== 'touch') return;
    const touch = Array.from(event.changedTouches).find(t => t.identifier === drag?.id);
    if (touch) endDrag(touch.clientY, event.timeStamp);
  }, { passive: true });
  dialog.addEventListener('touchcancel', () => {
    if (drag?.source === 'touch') resetDrag();
  });

  dialog.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0) return;
    startDrag('pointer', event.pointerId, event.target, event.clientX, event.clientY, event.timeStamp);
  });
  dialog.addEventListener('pointermove', event => {
    if (drag?.source !== 'pointer' || drag.id !== event.pointerId) return;
    moveDrag(event.clientX, event.clientY, event.timeStamp, active => {
      if (!active) dialog.setPointerCapture(event.pointerId);
      return true;
    });
  });
  dialog.addEventListener('pointerup', event => {
    if (drag?.source === 'pointer' && drag.id === event.pointerId) endDrag(event.clientY, event.timeStamp);
  });

  function cancelDrag(event: PointerEvent) {
    if (drag?.source === 'pointer' && drag.id === event.pointerId) resetDrag();
  }
  dialog.addEventListener('pointercancel', cancelDrag);
  dialog.addEventListener('lostpointercapture', event => {
    if (event.target === dialog) cancelDrag(event);
  });

  return { open: () => dialog.showModal(), close };
}
