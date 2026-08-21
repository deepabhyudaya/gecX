
export const performanceMonitor = {

  trackQuery: (operation: string, startTime: number) => {
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.warn(`Slow ${operation}: ${duration}ms`);
    }
  },

  trackRender: (componentName: string, startTime: number) => {
    const duration = performance.now() - startTime;
    if (duration > 16.67) {
      console.warn(`${componentName} render took ${duration.toFixed(2)}ms`);
    }
  },

  trackAblyPublish: (eventCount: number, startTime: number) => {
    const duration = Date.now() - startTime;
    console.log(`Ably publish: ${eventCount} events in ${duration}ms`);
  },

  trackSidebarPoll: (queryCount: number, duration: number) => {
    console.log(`Sidebar poll: ${queryCount} queries in ${duration}ms`);
  }
};