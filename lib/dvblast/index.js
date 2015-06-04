'use strict';

var O = require('ose').object(module, 'ose/lib/kind');
exports = O.append('node').exports;

/** Docs {{{1
 * @module videolan
 */

/**
 * @caption DVBlast kind
 *
 * @readme
 * [Entry kind] allowing to control DVBlast software
 *
 * See [DVB streamer example]
 *
 * @kind dvblast
 * @class videolan.lib.dvblast
 * @main videolan.lib.dvblast
 * @extend ose.lib.kind
 * @type singleton
 */

/**
 * Currently streaming info
 *
 * @property current
 * @type Object
 */

/**
 * List of boons
 *
 * @property current.boons
 * @type Array
 */

/**
 * Streaming to ip and port specified by this property. If not
 * specified, streaming is in multicast mode.
 *
 * {
 *   ip: {String},
 *   port: {Number}
 * }
 *
 * @property current.ucast
 * @type {Object}
 */

/**
 * Currently streamed multiplex entry
 *
 * @property current.mplex
 * @type Object
 */

/**
 * List of currently streaming channel entries
 *
 * @property current.channels
 * @type Array
 */

/**
 * Configuration file content
 *
 * @property current.config
 * @type String
 */

/**
 * The `aim` property has the same structure as `current`. This
 * property indicates that the requested streaming has not yet
 * started. When both properties are defined, streaming of `current`
 * is finishing and gets replaced with `aim` after new streaming
 * starts.
 *
 * @property aim
 * @type Object
 */

/**
 * Process handler
 *
 * @property ps
 * @type Object
 */

/**
 * Path to dvblast configuration file
 *
 * @property configFile
 * @type String
 */

/**
 * Reference to multicast address pool entry
 *
 * @property mcast
 * @type String
 */

/**
 * Currently requesting boon, assures boons requests serialization
 *
 * @property boon
 * @type Object
 */

// Public {{{1
exports.init = function() {  // {{{2
  this.on('boon', './boon');
};

exports.homeInit = function(entry) {  // {{{2
  entry.boons = [];
  entry.dval.mcast && entry.find(entry.dval.mcast, function(err, mcast) {
    if (err) {
      O.log.error(err);
    } else {
      entry.mcast = mcast;
    }
  });
};

exports.cleanup = function(entry) {  // {{{2
/**
 * Cleanup entry
 *
 * @param entry {Object} Entry to be cleaned up
 *
 * @method cleanup
 */

  cleanBoons(entry)

  this.kill(entry);
};

exports.applyAim = function(entry) {  // {{{2
/**
 * Stop current streaming and start new streaming defined by `aim`.
 *
 * @param entry {Object} Entry
 *
 * @method applyAim
 */

  if (! entry.aim) {
    cb(O.error(entry, 'There is no aim'));
    return;
  }

  cleanBoons(entry)

  entry.current = entry.aim;
  delete entry.aim;

  for (var i = 0; i < entry.current.boons.length; i++) {
    delete entry.current.boons[i].aim;
  }

  this.spawn(entry, O._.noop);
  return;
};

exports.removeBoon = function(entry, boon) {  // {{{2
/**
 * Remove `boon` from `entry`
 *
 * @param entry {Object} Entry
 * @param boon {Object} Boon to be removed
 *
 * @method removeBoon
 */

  delete boon.entry;

  if (boon.aim && entry.aim) {
    entry.aim.boons = O._.without(entry.aim.boons, boon);
    if (entry.aim.boons.length) {
      return;
    }

    delete entry.aim;
    return;
  }

  if (! entry.current) return;

  entry.current.boons = O._.without(entry.current.boons, boon);

  if (entry.current.boons.length) {
    return;
  }

  delete entry.current;

  this.kill(entry);
};

// }}}1
// Private {{{1
function cleanBoons(entry) {  // {{{2
  var list = entry && entry.current && entry.current.boons;

  if (! list) return;

  for (var i = 0; i < list.length; i++) {
    O.link.close(list[i], null, true);
  }
  return;
}

// }}}1
