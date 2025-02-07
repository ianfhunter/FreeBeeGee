/**
 * @file Handles the screensaver modal.
 * @module
 * @copyright 2021-2022 Markus Leupold-Löwenthal
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

import _ from '../../../lib/FreeDOM.mjs'

import {
  createModal,
  getModal,
  isModalActive,
  modalClose
} from '../../../view/room/modal.mjs'

// --- public ------------------------------------------------------------------

/**
 * Inform user about a disabled feature.
 */
export function modalDisabled (what) {
  if (!isModalActive()) {
    createModal()

    _('#modal-header').innerHTML = `
      <h3 class="modal-title">I'm afraid I can't do that 😞</h3>
    `
    _('#modal-body').innerHTML = `
      <p>This feature is not available in FreeBeeGee's demo mode.</p>
      <p>But if you install FreeBeeGee on your own server, you ${what}.</p>
    `

    _('#modal-footer').innerHTML = `
      <button id='btn-close' type="button" class="btn btn-primary">Oh. Ok!</button>
    `

    _('#btn-close').on('click', () => getModal().hide())
    _('#modal')
      .add('.modal-small')
      .on('hidden.bs.modal', () => { modalClose() })

    getModal().show()
  }
}
