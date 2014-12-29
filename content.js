'use strict';

exports = require('ose')
  .singleton(module, 'ose/lib/http/content')
  .exports
;

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
exports.addFiles = function() {
  this.addModule('lib/index');
  this.addModule('lib/dvblast/index');
  this.addModule('lib/vlc/index');
};
