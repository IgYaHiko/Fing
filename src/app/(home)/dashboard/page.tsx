"use client"
import React from 'react'
import DashboardLayout from './DashboardLayout'
import AddProjectButton from './components/AddProjectButton'
import AddRepoButton from './components/AddRepoButton'
import Image from 'next/image'
import { IMAES } from '../../../../public/assets/images/images'
import { useTRPC } from '@/trpc/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ProjectTable from './components/ProjectTable'
import { toast } from 'sonner'
import { PlayGroundProjects } from './types/types'
import HeaderLoader from '@/components/loader/HeaderLoader'
import { 
  deleteProjectById, 
  editProjectById, 
  duplicateProjectById 
} from '@/lib/playground-action'

const Dashboard = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Fetch playgrounds with proper typing
  const { data: playgrounds, isLoading, error } = useQuery(
    trpc.playground.getAllPlaygrounds.queryOptions()
  );

  const handleEdit = async (project: PlayGroundProjects) => {
    try {
      await editProjectById(project.id, {
        title: project.title,
        describtion: project.describtion,
        template: project.template
      });
      
      queryClient.invalidateQueries(
        trpc.playground.getAllPlaygrounds.queryOptions()
      );
      toast.success('Project edited successfully');
    } catch (error) {
      console.error('Failed to edit project:', error);
      toast.error('Failed to edit project', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProjectById(id);
      
      queryClient.invalidateQueries(
        trpc.playground.getAllPlaygrounds.queryOptions()
      );
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };

  const handleDuplicate = async (project: PlayGroundProjects) => {
    try {
      await duplicateProjectById(project.id);
      
      queryClient.invalidateQueries(
        trpc.playground.getAllPlaygrounds.queryOptions()
      );
      toast.success('Project duplicated successfully');
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      toast.error('Failed to duplicate project', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };

  return (
    <DashboardLayout>
      <section className="">
        <div className="container max-w-7xl px-4 md:px-8">
          <div className="flex flex-col items-center justify-center py-10 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <AddProjectButton />
              <AddRepoButton />
            </div>

            <div className='mt-10 md:mt-20 flex flex-col justify-center items-center w-full'>
              {isLoading ? (
                <HeaderLoader />
              ) : error ? (
                <p className="text-red-500">Failed to load projects</p>
              ) : playgrounds && playgrounds.length === 0 ? (
                <EmptyState />
              ) : (
                <ProjectTable
                  projects={playgrounds || []}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onUpdate={handleEdit}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  )
}

export default Dashboard

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16">
    <Image src={IMAES.Star} alt="No projects" className="w-56 h-56 mb-4" />
    <h2 style={{fontFamily: "poppins"}} className="text-xl md:text-4xl font-bold">No projects found</h2>
    <p className="text-gray-400 text-xs md:text-xl font-mono">Create a new project to get started!</p>
  </div>
)