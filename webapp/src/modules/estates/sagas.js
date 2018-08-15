import { takeEvery, put, select, call, all } from 'redux-saga/effects'
import { push } from 'react-router-redux'
import { eth } from 'decentraland-eth'

import { getParcelsNotIncluded } from 'shared/utils'
import { encodeMetadata } from 'shared/asset'
import { getAddress } from 'modules/wallet/selectors'

import {
  CREATE_ESTATE_REQUEST,
  createEstateSuccess,
  createEstateFailure,
  FETCH_ESTATE_REQUEST,
  fetchEstateSuccess,
  fetchEstateFailure,
  EDIT_ESTATE_PARCELS_REQUEST,
  editEstateParcelsSuccess,
  editEstateParcelsFailure,
  EDIT_ESTATE_METADATA_REQUEST,
  editEstateMetadataSuccess,
  editEstateMetadataFailure,
  ADD_PARCELS,
  REMOVE_PARCELS,
  DELETE_ESTATE_REQUEST,
  deleteEstateSuccess,
  deleteEstateFailure
} from './actions'
import { validateCoords } from './utils'
import { getEstates } from './selectors'
import { locations } from 'locations'
import { api } from 'lib/api'

export function* estateSaga() {
  yield takeEvery(CREATE_ESTATE_REQUEST, handleCreateEstateRequest)
  yield takeEvery(EDIT_ESTATE_PARCELS_REQUEST, handleEditEstateParcelsRequest)
  yield takeEvery(FETCH_ESTATE_REQUEST, handleEstateRequest)
  yield takeEvery(EDIT_ESTATE_METADATA_REQUEST, handleEditEstateMetadataRequest)
  yield takeEvery(DELETE_ESTATE_REQUEST, handleDeleteEstate)
}

function* handleCreateEstateRequest(action) {
  const { estate } = action
  try {
    estate.data.parcels.forEach(({ x, y }) => validateCoords(x, y))
    // call estate contract
    const xs = estate.data.parcels.map(p => p.x)
    const ys = estate.data.parcels.map(p => p.y)
    const metadata = {
      version: 0,
      name: estate.data.name,
      description: estate.data.description,
      ipns: ''
    }
    const data = yield call(() => encodeMetadata(metadata))
    const owner = yield select(getAddress)
    const land = eth.getContract('LANDRegistry')
    const txHash = yield call(() =>
      land.createEstateWithMetadata(xs, ys, owner, data)
    )
    yield put(createEstateSuccess(txHash, { ...estate, owner }))
    yield put(push(locations.activity))
  } catch (error) {
    yield put(createEstateFailure(error.message))
  }
}

function* handleEditEstateParcelsRequest(action) {
  const { estate } = action
  const newParcels = estate.data.parcels
  try {
    newParcels.forEach(({ x, y }) => validateCoords(x, y))

    const pristineEstate = (yield select(getEstates))[estate.asset_id]
    const pristineParcels = pristineEstate.data.parcels

    const parcelsToAdd = getParcelsNotIncluded(newParcels, pristineParcels)
    const parcelsToRemove = getParcelsNotIncluded(pristineParcels, newParcels)

    const owner = yield select(getAddress)
    const landRegistry = eth.getContract('LANDRegistry')
    const estateRegistry = eth.getContract('EstateRegistry')

    if (parcelsToAdd.length) {
      const xs = parcelsToAdd.map(p => p.x)
      const ys = parcelsToAdd.map(p => p.y)

      const txHash = yield call(() =>
        landRegistry.transferManyLandToEstate(xs, ys, estate.asset_id)
      )
      yield put(
        editEstateParcelsSuccess(txHash, estate, parcelsToAdd, ADD_PARCELS)
      )
    }

    if (parcelsToRemove.length) {
      const landIds = yield all(
        parcelsToRemove.map(({ x, y }) =>
          call(() => landRegistry.encodeTokenId(x, y))
        )
      )
      const txHash = yield call(() =>
        estateRegistry.transferManyLands(estate.asset_id, landIds, owner)
      )
      yield put(
        editEstateParcelsSuccess(
          txHash,
          estate,
          parcelsToRemove,
          REMOVE_PARCELS
        )
      )
    }

    yield put(push(locations.activity))
  } catch (error) {
    yield put(editEstateParcelsFailure(error.message))
  }
}

function* handleEditEstateMetadataRequest({ estate }) {
  try {
    const estateRegistry = eth.getContract('EstateRegistry')
    const data = yield call(() => encodeMetadata(estate.data))
    const txHash = yield call(() =>
      estateRegistry.updateMetadata(estate.asset_id, data)
    )
    yield put(editEstateMetadataSuccess(txHash, estate))
    yield put(push(locations.activity))
  } catch (error) {
    yield put(editEstateMetadataFailure(error.message))
  }
}

function* handleEstateRequest(action) {
  const { assetId } = action
  try {
    const estate = yield call(() => api.fetchEstate(assetId))
    yield put(fetchEstateSuccess(assetId, estate))
  } catch (error) {
    yield put(fetchEstateFailure(assetId, error.message))
  }
}

function* handleDeleteEstate({ estateId }) {
  const owner = yield select(getAddress)
  const landRegistry = eth.getContract('LANDRegistry')
  const estateRegistry = eth.getContract('EstateRegistry')
  try {
    const estate = (yield select(getEstates))[estateId]
    const parcelsToRemove = getParcelsNotIncluded(estate.data.parcels, [])
    const landIds = yield all(
      parcelsToRemove.map(({ x, y }) =>
        call(() => landRegistry.encodeTokenId(x, y))
      )
    )
    const txHash = yield call(() =>
      estateRegistry.transferManyLands(estateId, landIds, owner)
    )
    yield put(deleteEstateSuccess(txHash, estate))
    yield put(push(locations.activity))
  } catch (e) {
    yield put(deleteEstateFailure(e.message))
  }
}
