let scrollPosition = 0;

export const lockBodyScroll = () => {
  // Save current scroll position
  scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  
  // Apply styles to lock scroll
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollPosition}px`;
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
  
  // Also prevent touch scrolling on iOS
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.height = '100%';
};

export const unlockBodyScroll = () => {
  // Remove the styles
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.overflow = '';
  
  document.documentElement.style.overflow = '';
  document.documentElement.style.height = '';
  
  // Restore scroll position
  window.scrollTo(0, scrollPosition);
};