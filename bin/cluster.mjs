#!/usr/bin/env node

import cluster from 'node:cluster'

import { parseArgs } from 'node:util'
import { availableParallelism } from 'node:os'

const { values: { workers } } = parseArgs({
  strict: false,
  options: {
    workers: {
      type: 'string',
      short: 'w',
      default: String(availableParallelism())
    }
  }
})

cluster.setupPrimary({ exec: 'bin/worker.mjs' })

// cluster.on('exit', (worker, code, signal) => {
//   cluster.fork()
// })

cluster.on('message', (worker, message, handle) => {
  for (const id in cluster.workers) {
    if (id === worker.id.toString()) continue // don't forward to sender
    cluster.workers[id].send(message)
  }
})

console.log('main process is running with pid: %d', process.pid)
for (let i = 0; i < workers; ++i) {
  cluster.fork()
}
