export function detailInteraction(onOpen, label) {
  return {
    tabIndex: 0,
    'aria-label': label,
    onClick(event) {
      if (!event.currentTarget.contains(event.target)) return;
      const control = event.target.closest('a, button, input, textarea, select, [role="button"], [role="link"], [role="combobox"], [contenteditable="true"], .ant-picker, .ant-select, [data-detail-ignore]');
      if (!control || control === event.currentTarget) onOpen();
    },
    onKeyDown(event) {
      if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        onOpen();
      }
    },
  };
}
