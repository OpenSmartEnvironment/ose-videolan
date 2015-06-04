'use strict';

var O = require('ose').module(module);
O.package = 'ose-videolan';
O.scope = 'control';

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
 * @scope control
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

exports.config = function(name, val, deps) {  // {{{2
  O.kind('./vlc', 'vlc', deps);
  O.kind('./dvblast', 'dvblast', deps);

  O.content('../content');
};
