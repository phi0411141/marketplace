#!/usr/bin/env babel-node

import { eth, Log } from 'decentraland-commons'
import * as handlers from './handlers'
import { TransformCli } from './TransformCli'
import { db } from '../../src/database'
import { loadEnv } from '../../scripts/utils'

const log = new Log('main')

loadEnv('../../src/.env')

Promise.resolve()
  .then(() => {
    log.debug('Connecting to database')
    return db.connect()
  })
  .then(() => {
    log.debug('Connecting to Ethereum node')
    return eth.connect()
  })
  .then(() => {
    log.debug('Starting CLI')
    return new TransformCli(handlers).run()
  })
  .catch(error => {
    log.error(error)
    process.exit()
  })