/**
 * @file Holds and manages a table's data objects, a.k.a. state. Propagates
 *       changes to the API but is not in charge of syncing the state back.
 *       Might cache some values in the browser store.
 * @module
 * @copyright 2021 Markus Leupold-Löwenthal
 * @license This file is part of FreeBeeGee.
 *
 * FreeBeeGee is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * FreeBeeGee is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with FreeBeeGee. If not, see <https://www.gnu.org/licenses/>.
 */

import {
  getStoreValue,
  setStoreValue
} from '../../utils.js'
import {
  apiGetState,
  apiPutState,
  apiGetTable,
  apiPostTable,
  apiDeleteTable,
  apiPatchPiece,
  apiDeletePiece,
  apiPostPiece,
  UnexpectedStatus
} from '../../api.js'
import { syncNow } from './sync.js'
import { runError } from '../error.js'

let table = {} /** stores the table meta info JSON */

// --- public ------------------------------------------------------------------

/**
 * (Re)Fetch the table's state from the API and trigger the UI update.
 *
 * @param {String} name The current table name.
 * @return {Object} Promise of table metadata object.
 */
export function loadTable (name) {
  return apiGetTable(name)
    .then(remoteTable => {
      table = remoteTable
      return table
    })
    .catch((error) => { // invalid table
      runError('TABLE_GONE', name, error)
      return null
    })
}

/**
 * Get the current table's metadata (cached).
 *
 * @return {Object} Table's metadata.
 */
export function getTable () {
  return table
}

/**
 * Get the current table's table (cached).
 *
 * Until we support multiple tables, this is always table 0.
 *
 * @return {Object} Current table's template metadata.
 */
export function getTabletop () {
  return getTable()?.tables[0]
}

/**
 * Get the current table's template (cached).
 *
 * Until we support multiple tables, this is always the template of table 0.
 *
 * @return {Object} Current table's template metadata.
 */
export function getTemplate () {
  return getTabletop()?.template
}

/**
 * Get the current table's template (cached).
 *
 * Until we support multiple tables, this is always the template of table 0.
 *
 * @return {Object} Current table's template metadata.
 */
export function getLibrary () {
  return getTabletop()?.library
}

/**
 * Get an asset from the asset cache.
 *
 * @param {String} id Asset ID.
 * @return {Object} Asset or null if it is unknown.
 */
export function getAsset (id) {
  let asset
  asset = getLibrary()?.token?.find(asset => asset.id === id)
  if (asset) return asset
  asset = getLibrary()?.tile?.find(asset => asset.id === id)
  if (asset) return asset
  asset = getLibrary()?.overlay?.find(asset => asset.id === id)
  if (asset) return asset
  asset = getLibrary()?.other?.find(asset => asset.id === id)
  if (asset) return asset
  return { // create dummy asset
    assets: ['invalid.svg'],
    width: 1,
    height: 1,
    color: '40bfbf',
    alias: 'invalid',
    type: 'tile',
    id: '0000000000000000'
  }
}

/**
 * Create a new table on the server.
 *
 * @param {Object} table The table object to send to the API.
 * @param {Object} snapshot File input or null if no snapshot is to be uploaded.
 * @return {Object} Promise of created table metadata object.
 */
export function createTable (table, snapshot) {
  return apiPostTable(table, snapshot)
}

/**
 * Get a setting from the browser HTML5 store. Automatically scoped to active
 * table.
 *
 * @param {String} pref Setting to obtain.
 * @return {String} The setting's value.
 */
export function stateGetTablePref (pref) {
  return getStoreValue('g' + table.id.substr(0, 8), pref)
}

/**
 * Set a setting in the browser HTML5 store. Automatically scoped to active
 * table.
 *
 * @param {String} pref Setting to set.
 * @param {String} value The value to set.
 */
export function stateSetTablePref (pref, value) {
  setStoreValue('g' + table.id.substr(0, 8), pref, value)
}

/**
 * Set the label of a piece of the current table.
 *
 * Will only do an API call and rely on later sync to get the change back to the
 * data model.
 *
 * @param {String} pieceId ID of piece to change.
 * @param {String} label New label text.
 */
export function stateLabelPiece (pieceId, label) {
  patchPiece(pieceId, { label: label })
}

/**
 * Set the x/y/z of a piece of the current table.
 *
 * Will only do an API call and rely on later sync to get the change back to the
 * data model.
 *
 * @param {String} pieceId ID of piece to change.
 * @param {?Number} x New x. Will not be changed if null.
 * @param {?Number} y New y. Will not be changed if null.
 * @param {?Number} z New z. Will not be changed if null.
 */
export function stateMovePiece (pieceId, x = null, y = null, z = null) {
  const patch = {
    x: x != null ? x : undefined,
    y: y != null ? y : undefined,
    z: z != null ? z : undefined
  }
  patchPiece(pieceId, patch)
}

/**
 * Rotate a piece of the current table.
 *
 * Will only do an API call and rely on later sync to get the change back to the
 * data model.
 *
 * @param {String} pieceId ID of piece to change.
 * @param {Number} r New rotation (0, 90, 180, 270).
 */
export function stateRotatePiece (pieceId, r) {
  patchPiece(pieceId, { r: r })
}

/**
 * Update the number/letter of a piece/token.
 *
 * Will only do an API call and rely on later sync to get the change back to the
 * data model.
 *
 * @param {String} pieceId ID of piece to change.
 * @param {Number} no New number (0..27).
 */
export function stateNumberPiece (pieceId, no) {
  patchPiece(pieceId, { no: no })
}

/**
 * Flip a piece of the current table and show another side of it.
 *
 * Will only do an API call and rely on later sync to get the change back to the
 * data model.
 *
 * @param {String} pieceId ID of piece to change.
 * @param {Number} side New side. Zero-based.
 */
export function stateFlipPiece (pieceId, side) {
  patchPiece(pieceId, {
    side: side
  })
}

/**
 * Change the outline/border color.
 *
 * Will only do an API call and rely on later sync to get the change back to the
 * data model.
 *
 * @param {String} pieceId ID of piece to change.
 * @param {Number} border New border. Zero-based.
 */
export function stateBorderPiece (pieceId, border) {
  patchPiece(pieceId, {
    border: border
  })
}

/**
 * Edit multiple properties of a piece of the current table.
 *
 * Will only do an API call and rely on later sync to get the change back to the
 * data model.
 *
 * @param {String} pieceId ID of piece to change.
 * @param {Object} updates All properties to be changed. Unchanged properties
 *                         should be omitted.
 */
export function statePieceEdit (pieceID, updates) {
  if (Object.keys(updates).length > 0) {
    patchPiece(pieceID, updates)
  }
}

/**
 * Remove a piece from the current table (from the table, not from the library).
 *
 * Will only do an API call and rely on later sync to get the change back to the
 * data model.
 *
 * @param {String} pieceId ID of piece to remove.
 */
export function stateDeletePiece (id) {
  apiDeletePiece(table.name, 1, id)
    .catch(error => {
      runError('UNEXPECTED', error)
    })
    .finally(() => {
      syncNow()
    })
}

/**
 * Edit multiple properties of a piece of the current table.
 *
 * Will only do an API call and rely on later sync to get the change back to the
 * data model.
 *
 * @param {Object} piece Full piece to be created.
 * @param {Boolean} selected If true, the piece should be selected after
 *                           creating it. Defaults to false.
 */
export function stateCreatePiece (piece, selected = false) {
  let selectid = null
  apiPostPiece(table.name, 1, piece)
    .then(piece => {
      selectid = piece.id
    })
    .catch(error => {
      runError('UNEXPECTED', error)
    })
    .finally(() => {
      syncNow(selected ? [selectid] : [])
    })
}

/**
 * Update the table state to the a new one.
 *
 * Will replace the existing state.
 *
 * @param {Array} state Array of pieces (table state).
 */
export function updateState (state) {
  apiPutState(table.name, 1, state)
    .catch(error => {
      runError('UNEXPECTED', error)
    })
    .finally(() => {
      syncNow()
    })
}

/**
 * Restore a saved table state.
 *
 * @param {Number} index Integer index of state, 0 = initial.
 */
export function restoreState (index) {
  apiGetState(table.name, index)
    .then(state => {
      apiPutState(table.name, 1, state)
        .catch(error => {
          runError('UNEXPECTED', error)
        })
        .finally(() => {
          syncNow()
        })
    })
    .catch(error => {
      runError('UNEXPECTED', error)
    })
}

/**
 * Update (patch) a series of pieces.
 *
 * Will do only one state refresh after updating all items in the list.
 *
 * @param {Array} pieces (Partial) pieces to patch.
 */
export function updatePieces (pieces) {
  if (!pieces || pieces.length <= 0) return
  const piece = pieces.shift()
  patchPiece(piece.id, piece, false)
    .then(() => {
      if (pieces.length > 0) updatePieces(pieces)
    })
    .finally(() => {
      if (pieces.length === 0) syncNow()
    })
}

/**
 * Delete the current table for good.
 *
 * @return {Promise} Promise of deletion to wait for.
 */
export function deleteTable () {
  return apiDeleteTable(table.name)
}

// --- internal ----------------------------------------------------------------

/**
 * Update a piece on the server.
 *
 * @param {String} pieceId ID of piece to change.
 * @param {Object} patch Partial object of fields to send.
 * @param {Object} poll Optional. If true (default), the table state will be
 *                 polled after the patch.
 * @return {Object} Promise of the API request.
 */
function patchPiece (pieceId, patch, poll = true) {
  return apiPatchPiece(table.name, 1, pieceId, patch)
    .catch(error => {
      if (error instanceof UnexpectedStatus && error.status === 404) {
        // we somewhat expected this situation. silently ignore it.
        console.info('Piece ' + pieceId + ' got deleted - no need to PATCH it.')
      } else {
        runError('UNEXPECTED', error) // *that* was unexpected
      }
    })
    .finally(() => {
      if (poll) syncNow()
    })
}
