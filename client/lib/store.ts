import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "@/types/vision";

interface ProjectState {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      selectedProject: null,
      setSelectedProject: (project) => set({ selectedProject: project }),
    }),
    {
      name: "vision-project-storage",
    },
  ),
);

interface LayoutState {
  isRightPanelOpen: boolean;
  hasHydrated: boolean;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isRightPanelOpen: false,
      hasHydrated: false,
      toggleRightPanel: () =>
        set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
      setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
    }),
    {
      name: "vision-layout-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
