import type {
  ComponentProps,
} from 'react'

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'

import {
  cn,
} from '@/lib/utils'

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal
const AlertDialogTitle = AlertDialogPrimitive.Title
const AlertDialogDescription = AlertDialogPrimitive.Description
const AlertDialogCancel = AlertDialogPrimitive.Cancel
const AlertDialogAction = AlertDialogPrimitive.Action

function AlertDialogOverlay({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn('fixed inset-0 z-50 bg-black/45', className)}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background p-4 text-foreground shadow-lg outline-none',
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
}
