import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project } from '@/types/vision';

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
      name: 'vision-project-storage',
    }
  )
);
