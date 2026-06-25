/// <reference path="../src/types/global.d.ts" />

// @ts-ignore
import '../src/xds/colors.css'
// @ts-ignore
import '../src/index.css'
import React from 'react'
import { withRouter } from 'storybook-addon-remix-react-router'

const withLocationPathControl = (Story: any, context: any) => {
  const locationPath = context.args?.locationPath

  if (typeof locationPath === 'string' && locationPath.trim().length > 0) {
    const reactRouter = context.parameters.reactRouter ?? {}
    const currentLocation = typeof reactRouter.location === 'object' && reactRouter.location !== null ? reactRouter.location : {}

    context.parameters.reactRouter = {
      ...reactRouter,
      location: {
        ...currentLocation,
        path: locationPath,
      },
    }
  }

  return (withRouter as any)(Story, context)
}

export const decorators = [withLocationPathControl]

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/
    }
  },
  options: {
    storySort: {
      order: ['App', ['Full Application', 'Landing', 'Authentication']]
    }
  }
}
