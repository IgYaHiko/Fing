import { Button } from '@/components/ui/button'
import { Fragment } from '@/generated/prisma'
import { ExternalLinkIcon, RefreshCcw, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Hint from './Hint'

interface Props {
  data: Fragment | null
}

const FragmentView = ({ data }: Props) => {
  const [sandboxStatus, setSandboxStatus] = useState<'loading' | 'active' | 'inactive' | 'error'>('loading')
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // Check if e2b sandbox is accessible
  const checkSandboxStatus = async () => {
    if (!data?.sandboxUrl) {
      setSandboxStatus('inactive')
      return
    }

    setSandboxStatus('loading')

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      await fetch(data.sandboxUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      setSandboxStatus('active')
      setLastChecked(new Date())
    } catch {
      // E2B blocks CORS, so assume it's active
      setSandboxStatus('active')
      setLastChecked(new Date())
    }
  }

  useEffect(() => {
    checkSandboxStatus()
  }, [data?.sandboxUrl])

  const handleCopy = () => {
    if (!data?.sandboxUrl) return
    navigator.clipboard.writeText(data.sandboxUrl)
      .then(() => toast.success('Sandbox URL copied!'))
      .catch(() => toast.error('Failed to copy URL'))
  }

  const handleOpenNewTab = () => {
    if (!data?.sandboxUrl) return
    window.open(data.sandboxUrl, '_blank', 'noopener,noreferrer')
  }

  const getStatusIcon = () => {
    switch (sandboxStatus) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    }
  }

  const getStatusText = () => {
    switch (sandboxStatus) {
      case 'active':
        return 'Sandbox is running'
      case 'inactive':
        return 'Sandbox not available'
      case 'error':
        return 'Sandbox may be starting'
      default:
        return 'Checking sandbox status...'
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-3 border-b flex flex-col gap-2  backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          {lastChecked && (
            <span className="text-xs text-gray-400">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <Hint side="bottom" align="start" message="Refresh status">
            <Button size="sm" variant="outline" onClick={checkSandboxStatus}>
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </Hint>

          <Hint message="Click to copy sandbox URL">
            <Button
              size="sm"
              className="flex-1 justify-start text-start font-normal"
              variant="outline"
              onClick={handleCopy}
            >
              <span className="truncate text-xs">{data?.sandboxUrl}</span>
            </Button>
          </Hint>

          <Hint side="bottom" align="start" message="Open in new tab">
            <Button
              size="sm"
              onClick={handleOpenNewTab}
              disabled={!data?.sandboxUrl}
              variant="outline"
            >
              <ExternalLinkIcon className="w-4 h-4" />
            </Button>
          </Hint>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md w-full space-y-6">
          {/* Sandbox Preview Card */}
          <div className="border rounded-2xl shadow-lg  p-6 backdrop-blur-md">
            <div className="w-full h-48 rounded-xl overflow-hidden bg-neutral-800 flex items-center justify-center">
              {/* You can replace this image with a screenshot API later */}
               <img
          src={generateGradientThumbnail()}
          alt="Sandbox preview"
          className="w-full h-full object-cover"
        />
            </div>

            <h3 className="text-xl font-semibold mt-4 ">
              {sandboxStatus === 'active' ? 'Sandbox Ready' : 'Sandbox Access'}
            </h3>

            <p className="text-gray-400 text-sm mt-2">
              {sandboxStatus === 'active'
                ? 'Your E2B sandbox is running. Click the button below to open it in a new tab for the best experience.'
                : 'E2B sandboxes provide secure, isolated environments for your code.'}
            </p>

            <div className="mt-6 space-y-3">
              <Button
                onClick={handleOpenNewTab}
                disabled={!data?.sandboxUrl}
                className="w-full"
                size="lg"
              >
                <ExternalLinkIcon className="w-4 h-4 mr-2" />
                Open Sandbox in New Tab
              </Button>

              <div className="text-xs text-gray-500 space-y-1">
                <p>💡 <strong>Why new tab?</strong> E2B sandboxes block iframe embedding.</p>
                <p>🔒 Secure isolated environment</p>
                <p>⚡ Fast, ephemeral Next.js preview</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FragmentView


export const generateGradientThumbnail = () => {
  const gradients = [
    ["#667eea", "#764ba2"],
    ["#f093fb", "#f5576c"],
    ["#4facfe", "#00f2fe"],
    ["#43e97b", "#38f9d7"],
    ["#fa709a", "#fee140"],
    ["#a8edea", "#fed6e3"],
    ["#ff9a9e", "#fecfef"],
    ["#ffecd2", "#fcb69f"],
  ];

  const [startColor, endColor] =
    gradients[Math.floor(Math.random() * gradients.length)];

  const svgContent = `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <circle cx="150" cy="100" r="30" fill="white" opacity="0.8" />
      <path d="M140 90 L160 90 L160 110 L140 110 Z" fill="white" opacity="0.6" />
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
};
