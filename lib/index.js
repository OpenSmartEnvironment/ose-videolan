'use strict';

var Ose = require('ose');
var M = Ose.package(module);
exports = M.init();

/** Docs {{{1
 * @caption VideoLAN
 *
 * @readme
 * This package contains [entry kinds] integrating VideoLAN software
 * into OSE.
 *
 * It allows the [Media player] to use VLC as its playback
 * application and DVBlast as its DVB streamer.
 *
 * See [Media player example].
 *
 * @module videolan
 * @main videolan
 */

/**
 * @caption VideoLAN core
 *
 * @readme
 * Core singleton of [ose-videolan] npm package. Registers [entry kinds]
 * defined by this package to the `"control"` [scope].
 *
 * @class videolan.lib
 * @type singleton
 */

// Public {{{1
exports.browserConfig = true;

M.content();

M.scope = 'control';
M.kind('./vlc', 'vlc');
M.kind('./dvblast', 'dvblast');
