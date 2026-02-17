"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Project } from "@/types/api";
import PlusIcon from "@/components/icons/plus";
import FolderIcon from "@/components/icons/folder";
import { ProjectDialog } from "./project-dialog";
import { useProjectStore } from "@/lib/store";
import api from "@/lib/api";

interface ProjectListProps {
  projects: Project[];
  onUpdate?: (projects: Project[]) => void;
}

export function ProjectList({ projects: initialProjects, onUpdate }: ProjectListProps) {
  const [projects, setProjects] = useState(initialProjects);
  const { setSelectedProject } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  const updateProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    onUpdate?.(newProjects);
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProject = async (data: { name: string; description: string }) => {
    try {
      setLoading(true);
      const newProject = await api.projects.create({
        name: data.name,
        description: data.description,
        status: "active",
      });
      updateProjects([newProject, ...projects]);
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = async (data: { name: string; description: string }) => {
    if (!editingProject) return;
    try {
      setLoading(true);
      const updatedProject = await api.projects.update(editingProject.id, data);
      updateProjects(
        projects.map((p) => (p.id === editingProject.id ? updatedProject : p))
      );
      setEditingProject(null);
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to update project:", error);
      alert("Failed to update project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      setLoading(true);
      await api.projects.delete(projectId);
      updateProjects(projects.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "active":
        return "bg-success/20 text-success border-success/30";
      case "inactive":
        return "bg-warning/20 text-warning border-warning/30";
      case "archived":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-xl font-display">Project List</CardTitle>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64"
              />
              <Button
                onClick={() => {
                  setEditingProject(null);
                  setDialogOpen(true);
                }}
                className="shrink-0"
                disabled={loading}
              >
                <PlusIcon className="size-4 mr-2" />
                New Project
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderIcon className="size-12 mb-4 opacity-50" />
              <p className="text-lg">No projects found</p>
              <p className="text-sm">Create your first project to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group cursor-pointer"
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FolderIcon className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{project.name}</h3>
                      <Badge
                        variant="outline"
                        className={getStatusColor(project.status)}
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {project.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Updated: {formatDate(project.updated_at || project.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProject(project);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive bg-transparent"
                      disabled={loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={editingProject ? handleEditProject : handleCreateProject}
        defaultValues={
          editingProject
            ? { name: editingProject.name, description: editingProject.description }
            : undefined
        }
        mode={editingProject ? "edit" : "create"}
      />
    </>
  );
}
