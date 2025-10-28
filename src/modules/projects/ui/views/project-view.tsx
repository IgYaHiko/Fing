"use client"
import React, { Suspense, useState } from 'react'
import {ResizableHandle,ResizablePanel,ResizablePanelGroup} from "@/components/ui/resizable"
import MesssageContainer from './components/message-container'
import { Fragment } from '@/generated/prisma'
import ProjectHeader from './components/ProjectHeader'
import FragmentView from './components/FragmentView'
import { Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Braces, CrownIcon, EyeIcon } from 'lucide-react'
import FileExplorer from '@/components/FileExploer'
import UserControl from '@/components/user-control'
import CustomLoader from '@/components/loader/CustomLoader'
import HeaderLoader from '@/components/loader/HeaderLoader'
import { ErrorBoundary } from 'react-error-boundary'
import MessageError from '@/components/Error/messageError'

interface Props {
  projectId: string
}

// Updated Model configuration with working models
const MODEL_OPTIONS = [
  { value: 'gpt-4.1', label: 'OpenAI GPT-4.1' },
  { value: 'gpt-4o', label: 'OpenAI GPT-4o' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' }
] as const;

type ModelValue = typeof MODEL_OPTIONS[number]['value'];

const ProjectView = ({projectId}: Props) => {
  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
  const [tabState, setTabState] = useState<"preview" | "code">("preview");
  const [selectedModel, setSelectedModel] = useState<ModelValue>('gpt-4.1');

  const handleModelChange = (model: string) => {
    if (MODEL_OPTIONS.some(opt => opt.value === model)) {
      setSelectedModel(model as ModelValue);
    }
  };

  // Add fallback for when no fragment is selected
  const renderPreviewContent = () => {
    if (!activeFragment) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-muted/50 text-center p-8">
          <div className="max-w-md">
            <EyeIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
            <p className="text-muted-foreground mb-4">
              Generate a fragment by sending a message to see the preview here.
            </p>
            <p className="text-sm text-muted-foreground">
              The sandbox will appear here once a fragment is created.
            </p>
          </div>
        </div>
      );
    }
    
    return <FragmentView data={activeFragment} />;
  };

  // Add fallback for when no code is available
  const renderCodeContent = () => {
    if (!activeFragment?.files) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-muted/50 text-center p-8">
          <div className="max-w-md">
            <Braces className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Code Available</h3>
            <p className="text-muted-foreground mb-4">
              Generate a fragment by sending a message to see the code here.
            </p>
            <p className="text-sm text-muted-foreground">
              The file explorer will show the generated code files once a fragment is created.
            </p>
          </div>
        </div>
      );
    }
    
    return <FileExplorer files={activeFragment.files as {[path:string]:string}} />;
  };

  return (
    <div className='h-screen'>
      <ResizablePanelGroup direction='horizontal'>
        <ResizablePanel
          defaultSize={35}
          minSize={25}
          className='flex flex-col min-h-0'
        >
          <ErrorBoundary fallback={<MessageError/>}> 
            <Suspense fallback={<HeaderLoader/>}>
              <ProjectHeader
                projectId={projectId}
                selectedModel={selectedModel}
                setSelectedModel={handleModelChange}
              />
            </Suspense>
            
            <Suspense fallback={<CustomLoader/>}>
              <MesssageContainer
                activeFragment={activeFragment}
                setActiveFragment={setActiveFragment}
                projectId={projectId}
                selectedModel={selectedModel}
              />
            </Suspense>
          </ErrorBoundary>
        </ResizablePanel>
        
        <ResizableHandle className='hover:bg-primary transition-colors' />
        
        <ResizablePanel defaultSize={65} minSize={50}>
          <Tabs
            className='h-full'
            defaultValue='preview'
            value={tabState}
            onValueChange={(value) => setTabState(value as "preview" | "code")}
          >
            <div className='flex w-full justify-between bg-sidebar p-2 border-b'>
              <TabsList className='h-8 p-0 gap-1 border rounded-md'>
                <TabsTrigger className='rounded-md' value='preview'>
                  <EyeIcon className='size-4' />
                  <span className='font-mono text-xs'>Demo</span>
                </TabsTrigger>
                <TabsTrigger className='rounded-md' value='code'>
                  <Braces className='size-4' />
                  <span className='font-mono text-xs'>Code</span>
                </TabsTrigger>
              </TabsList>
              
              <div className='ml-auto gap-3 flex items-center'>
                <Button
                  asChild
                  size="sm"
                  className="relative overflow-hidden font-mono text-white px-5 py-2 border border-transparent
                  bg-gradient-to-r from-purple-500 via-pink-500 to-red-500
                  bg-[length:200%_200%] animate-gradient-shine transition-all duration-500"
                >
                  <Link href="/pricing" className="flex items-center gap-2">
                    <CrownIcon className="h-4 w-4" />
                    Upgrade
                  </Link>
                </Button>
                <UserControl />
              </div>
            </div>
            
            <TabsContent className='-mt-2 h-full' value='preview'>
              {renderPreviewContent()}
            </TabsContent>
            
            <TabsContent className='-mt-2 h-full' value='code'>
              {renderCodeContent()}
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default ProjectView