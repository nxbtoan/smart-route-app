import { create } from 'zustand';

const useRouteStore = create((set) => ({
  locations: [],
  
  // Lưu kết quả của cả 3 mô hình dưới dạng Object
  routesData: null, 
  
  // Trạng thái hiển thị: 'all', 'balanced', 'fastest', 'shortest'
  activeView: 'all', 

  addLocation: (location) => set((state) => ({ 
    locations: [...state.locations, location] 
  })),

  removeLocation: (id) => set((state) => ({
    locations: state.locations.filter(loc => loc.id !== id)
  })),

  updateTimeWindow: (id, newTimeWindow) => set((state) => ({
    locations: state.locations.map(loc => 
      loc.id === id ? { ...loc, time_window: newTimeWindow } : loc
    )
  })),

  reorderLocations: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.locations);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { locations: result };
  }),

  setAllRoutesData: (data) => set({ 
    routesData: data,
    activeView: 'all'
  }),

  setActiveView: (view) => set({ activeView: view }),

  clearRoute: () => set({ 
    locations: [], routesData: null, activeView: 'all'
  })
}));

export default useRouteStore;