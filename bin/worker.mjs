#!/usr/bin/env node

import cluster from 'node:cluster'

import { parseArgs } from 'node:util'
import { createSignalingServer } from '../index.mjs'

const { values: { port } } = parseArgs({
  strict: false,
  options: {
    port: {
      type: 'string',
      short: 'p',
      default: '80'
    }
  }
})

createSignalingServer({ ipc: cluster.isWorker ? process : null }) // ipc is not really needed when isPrimary (done), or when there is just one worker (fixme)
  .listen(port, function () {
    console.log('worker process is running with pid: %d using: %s', process.pid, this.address())
  })
