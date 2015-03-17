'use strict';

var O = require('ose').object(module, Init, 'ose/lib/http/content');
exports = O.init();

/** Docs  {{{1
 * @module videolan
 */

/**
 * @caption VideoLAN content
 *
 * @readme
 * Provides files of [ose-videolan] package to the browser.
 *
 * @class videolan.content
 * @type singleton
 * @extends ose.lib.http.content
 */

// Public {{{1
function Init() {
  O.super.call(this);

  this.addModule('lib/index');
  this.addModule('lib/dvblast/index');
  this.addModule('lib/vlc/index');
};
